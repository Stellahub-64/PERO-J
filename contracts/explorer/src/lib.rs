#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short,
    Address, Bytes, BytesN, Env, String, Symbol, Vec,
    panic_with_error,
};

soroban_sdk::contractmeta!(key = "name", val = "PERO-J");
soroban_sdk::contractmeta!(key = "version", val = "0.1.0");

// ── Error codes ──────────────────────────────────────────────────────────────
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotFound          = 1,
    Unauthorized      = 2,
    AlreadyExists     = 3,
    LimitExceeded     = 4,
    NotInitialized    = 5,
}

// ── Input limits ─────────────────────────────────────────────────────────────
// Bounds on caller-supplied payloads so a single call cannot bloat on-chain
// storage (and the rent every user pays for it) without limit.

/// Largest `raw_data` blob accepted by `submit_event`.
pub const MAX_RAW_DATA_BYTES: u32 = 4096;
/// Largest `description` string accepted by `submit_event`.
///
/// Without this bound, an admin or a compromised (allowlisted) indexer key
/// could store an arbitrarily large description per event — e.g. a 64 KB
/// string — inflating the rent every user pays for persistent storage.
pub const MAX_DESCRIPTION_LEN: u32 = 512;
/// Largest number of functions accepted in a `ContractMeta`.
pub const MAX_FUNCTIONS: u32 = 64;
/// Largest number of parameters accepted per function.
pub const MAX_PARAMS: u32 = 32;

// ── Storage keys ─────────────────────────────────────────────────────────────
#[contracttype]
pub enum DataKey {
    Admin,
    Contract(BytesN<32>),       // contract_id → ContractMeta
    ContractList,               // Vec<BytesN<32>> of all registered IDs
    EventLog(u64),              // seq → DecodedEvent
    EventSeq,
    IndexerAllowlist,       // → Vec<Address> of trusted event submitters
}

// ── Limits & TTL ──────────────────────────────────────────────────────────────

/// Maximum number of events `get_events` will read in a single call.
/// Guards against a caller passing a huge `limit` and exhausting the host's
/// CPU-instruction budget.
pub const MAX_PAGE: u32 = 200;

/// Maximum number of addresses that may sit on the indexer allowlist.
pub const MAX_INDEXERS: u32 = 20;

const DAY_IN_LEDGERS: u32 = 17_280;
/// Extend an entry whenever its remaining TTL drops below 30 days …
const TTL_THRESHOLD: u32 = 30 * DAY_IN_LEDGERS;
/// … and bump it back out to 90 days.
const TTL_EXTEND_TO: u32 = 90 * DAY_IN_LEDGERS;

// ── Data types ────────────────────────────────────────────────────────────────

/// ABI-like metadata for a registered contract.
#[contracttype]
#[derive(Clone)]
pub struct ContractMeta {
    pub name:        String,          // e.g. "StellarSwap"
    pub description: String,
    pub functions:   Vec<FunctionAbi>,
    pub registered_by: Address,
}

/// Describes one callable function so the explorer can decode calls.
#[contracttype]
#[derive(Clone)]
pub struct FunctionAbi {
    pub name:        Symbol,          // e.g. symbol_short!("swap")
    pub description: String,          // "Swap token_in for token_out"
    pub params:      Vec<ParamDef>,
}

/// Enumeration of all valid ABI parameter types.
///
/// Replacing the free-form `Symbol` prevents callers from registering
/// contracts with unknown kinds (e.g. `"foobar"`) that would later cause
/// silent decoding failures in the indexer.
#[contracttype]
#[derive(Clone, PartialEq)]
pub enum ParamKind {
    Address,
    I128,
    U32,
    Symbol,
    Bytes,
    Bool,
    String,
}

/// One parameter definition.
#[contracttype]
#[derive(Clone)]
pub struct ParamDef {
    pub name: Symbol,
    pub kind: ParamKind,
}

/// A decoded, human-readable event stored on-chain.
#[contracttype]
#[derive(Clone)]
pub struct DecodedEvent {
    pub seq:          u64,
    pub contract_id:  BytesN<32>,
    pub function:     Symbol,
    pub ledger:       u32,
    pub description:  String,   // "Address GA… swapped 100 USDC → 98.7 XLM"
    pub raw_topics:   Vec<String>,
    pub raw_data:     Bytes,
}

// ── TTL constants ─────────────────────────────────────────────────────────────
/// Minimum remaining ledgers before we extend the TTL (~1 day at 5 s/ledger).
const EVENTSEQ_TTL_THRESHOLD: u32 = 17_280;
/// Target TTL after extension (~30 days at 5 s/ledger).
const EVENTSEQ_TTL_BUMP: u32 = 518_400;

/// Minimum TTL for event log entries before we extend (~30 days).
const EVENT_TTL_MIN: u32 = 30 * DAY_IN_LEDGERS;
/// Target TTL for event log entries after extension (~365 days).
const EVENT_TTL_MAX: u32 = 365 * DAY_IN_LEDGERS;

// ── Contract ──────────────────────────────────────────────────────────────────
#[contract]
pub struct ExplorerContract;

// Internal helpers — deliberately outside `#[contractimpl]` so they are not
// exported as contract entry points.
impl ExplorerContract {
    /// Read the admin address from *persistent* storage.
    ///
    /// The admin lives in persistent storage (never instance storage) so that an
    /// expired instance entry can never make the contract look uninitialised.
    fn admin(env: &Env) -> Address {
        env.storage()
            .persistent()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic_with_error!(env, Error::NotFound))
    }

    /// Bump the TTL of the instance entry and of the admin entry.
    ///
    /// Called from every mutating entry point so that an active contract can
    /// never let its state — in particular the `Admin` guard used by `init` —
    /// lapse and become re-writable.
    fn bump_ttl(env: &Env) {
        env.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
        if env.storage().persistent().has(&DataKey::Admin) {
            env.storage()
                .persistent()
                .extend_ttl(&DataKey::Admin, TTL_THRESHOLD, TTL_EXTEND_TO);
        }
    }

    /// Validate that a `ContractMeta` payload is within the accepted size limits.
    ///
    /// Panics with `LimitExceeded` if the number of functions or the number of
    /// parameters on any single function exceeds the compile-time caps.  Called
    /// from both `register_contract` and `update_contract` so the check is not
    /// duplicated.
    fn validate_meta(env: &Env, meta: &ContractMeta) {
        if meta.functions.len() > MAX_FUNCTIONS {
            panic_with_error!(env, Error::LimitExceeded);
        }
        for i in 0..meta.functions.len() {
            if meta.functions.get(i).unwrap().params.len() > MAX_PARAMS {
                panic_with_error!(env, Error::LimitExceeded);
            }
        }
    }

    /// Read the next event sequence number from persistent storage.
    ///
    /// Panics with `NotInitialized` if the counter is missing, which means
    /// `init` has not been called yet.
    fn event_seq(env: &Env) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::EventSeq)
            .or_else(|| env.storage().instance().get(&DataKey::EventSeq))
            .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
    }

    /// Panic unless `caller` is the admin or sits on the indexer allowlist.
    fn require_submitter(env: &Env, caller: &Address) {
        if *caller == Self::admin(env) {
            return;
        }
        let allowlist: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::IndexerAllowlist)
            .unwrap_or_else(|| Vec::new(env));
        if !allowlist.contains(caller) {
            panic_with_error!(env, Error::Unauthorized);
        }
    }
    
}

#[contractimpl]
impl ExplorerContract {

    // ── Admin ─────────────────────────────────────────────────────────────────

    /// Initialise with an admin address (call once).
    ///
    /// The `Admin` marker is written to **persistent** storage: instance storage
    /// has a TTL, and if it lapsed an attacker could call `init` again and take
    /// over the contract.  Persistent entries can be archived but never silently
    /// disappear, so this guard is permanent.
    pub fn init(env: Env, admin: Address) {
        if env.storage().persistent().has(&DataKey::Admin) {
            panic_with_error!(&env, Error::AlreadyExists);
        }
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::EventSeq, &0u64);
        env.storage().persistent().extend_ttl(
            &DataKey::EventSeq, EVENTSEQ_TTL_THRESHOLD, EVENTSEQ_TTL_BUMP,
        );
        Self::bump_ttl(&env);
    }

    /// Return the current admin address.
    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .persistent()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotInitialized))
    }

    /// Transfer admin rights to a new address.
    ///
    /// Only the current admin may call this.  Both `current_admin` and
    /// `new_admin` must authorise the transaction so that a mis-typed address
    /// cannot accidentally lock the contract.
    ///
    /// Key-management recommendation: keep `new_admin` on a hardware wallet
    /// (Ledger/Trezor) or use a multi-sig account.  See SECURITY.md for the
    /// emergency recovery procedure.
    pub fn transfer_admin(env: Env, current_admin: Address, new_admin: Address) {
        current_admin.require_auth();
        // See SECURITY.md's Admin Transfer Procedure for the required auth envelope.
        new_admin.require_auth();

        let stored = Self::admin(&env);

        if current_admin != stored {
            panic_with_error!(&env, Error::Unauthorized);
        }

        env.storage().persistent().set(&DataKey::Admin, &new_admin);
        Self::bump_ttl(&env);
        env.events().publish(
            (symbol_short!("adm_xfr"),),
            (current_admin, new_admin),
        );
    }

    // ── Indexer allowlist ─────────────────────────────────────────────────────

    /// Whitelist `indexer` as a trusted event submitter.
    ///
    /// In production the indexer runs as a hot wallet that must be able to call
    /// `submit_event` without holding the (cold) admin key.
    pub fn add_indexer(env: Env, admin: Address, indexer: Address) {
        admin.require_auth();
        if admin != Self::admin(&env) {
            panic_with_error!(&env, Error::Unauthorized);
        }

        let mut allowlist: Vec<Address> = env.storage().persistent()
            .get(&DataKey::IndexerAllowlist)
            .unwrap_or_else(|| Vec::new(&env));

        if allowlist.contains(&indexer) {
            panic_with_error!(&env, Error::AlreadyExists);
        }
        if allowlist.len() >= MAX_INDEXERS {
            panic_with_error!(&env, Error::LimitExceeded);
        }

        allowlist.push_back(indexer.clone());
        env.storage().persistent().set(&DataKey::IndexerAllowlist, &allowlist);
        Self::bump_ttl(&env);
        env.storage().persistent().extend_ttl(
            &DataKey::IndexerAllowlist, TTL_THRESHOLD, TTL_EXTEND_TO,
        );

        env.events().publish((symbol_short!("idx_add"),), indexer);
    }

    /// Revoke a previously whitelisted indexer.
    pub fn remove_indexer(env: Env, admin: Address, indexer: Address) {
        admin.require_auth();
        if admin != Self::admin(&env) {
            panic_with_error!(&env, Error::Unauthorized);
        }

        let mut allowlist: Vec<Address> = env.storage().persistent()
            .get(&DataKey::IndexerAllowlist)
            .unwrap_or_else(|| Vec::new(&env));

        let idx = allowlist
            .first_index_of(&indexer)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotFound));

        allowlist.remove(idx);
        env.storage().persistent().set(&DataKey::IndexerAllowlist, &allowlist);
        Self::bump_ttl(&env);

        env.events().publish((symbol_short!("idx_rm"),), indexer);
    }

    /// List every address currently allowed to submit events (excluding admin).
    pub fn get_indexers(env: Env) -> Vec<Address> {
        env.storage().persistent()
            .get(&DataKey::IndexerAllowlist)
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// True if `address` may call `submit_event` (admin or allowlisted indexer).
    pub fn is_indexer(env: Env, address: Address) -> bool {
        let allowlist: Vec<Address> = env.storage().persistent()
            .get(&DataKey::IndexerAllowlist)
            .unwrap_or_else(|| Vec::new(&env));
        allowlist.contains(&address)
            || env.storage().persistent().get::<_, Address>(&DataKey::Admin)
                  .map_or(false, |a| a == address)
    }

    // ── Contract Registry ─────────────────────────────────────────────────────

    /// Register ABI-like metadata for a Soroban contract.
    pub fn register_contract(
        env:         Env,
        caller:      Address,
        contract_id: BytesN<32>,
        meta:        ContractMeta,
    ) {
        caller.require_auth();
        Self::validate_meta(&env, &meta);
        let key = DataKey::Contract(contract_id.clone());
        if env.storage().persistent().has(&key) {
            panic_with_error!(&env, Error::AlreadyExists);
        }
        env.storage().persistent().set(&key, &meta);

        let mut contract_ids: Vec<BytesN<32>> = env.storage()
            .persistent()
            .get(&DataKey::ContractList)
            .unwrap_or_else(|| Vec::new(&env));
        contract_ids.push_back(contract_id.clone());
        env.storage().persistent().set(&DataKey::ContractList, &contract_ids);
        env.storage().persistent().extend_ttl(
            &DataKey::ContractList, TTL_THRESHOLD, TTL_EXTEND_TO,
        );

        Self::bump_ttl(&env);
        env.events().publish(
            (symbol_short!("register"), contract_id),
            meta.name,
        );
    }

    /// Update metadata (admin or original registrant only).
    pub fn update_contract(
        env:         Env,
        caller:      Address,
        contract_id: BytesN<32>,
        meta:        ContractMeta,
    ) {
        caller.require_auth();
        Self::validate_meta(&env, &meta);
        let key = DataKey::Contract(contract_id.clone());
        let existing: ContractMeta = env.storage().persistent()
            .get(&key).unwrap_or_else(|| panic_with_error!(&env, Error::NotFound));

        let admin = Self::admin(&env);
        if caller != existing.registered_by && caller != admin {
            panic_with_error!(&env, Error::Unauthorized);
        }
        env.storage().persistent().set(&key, &meta);
        Self::bump_ttl(&env);

        // Emitted so the indexer can invalidate its in-memory ABI cache instead
        // of polling storage for metadata revisions.
        env.events().publish(
            (symbol_short!("update"), contract_id),
            meta.name,
        );
    }

    /// Fetch metadata for a contract.
    pub fn get_contract(env: Env, contract_id: BytesN<32>) -> ContractMeta {
        env.storage().persistent()
            .get(&DataKey::Contract(contract_id))
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotFound))
    }

    /// Return all registered contract IDs.
    pub fn get_contracts(env: Env) -> Vec<BytesN<32>> {
        env.storage().persistent()
            .get(&DataKey::ContractList)
            .unwrap_or(Vec::new(&env))
    }

    // ── Event Decoder ─────────────────────────────────────────────────────────

    /// Submit a decoded event (called by the off-chain indexer via a trusted tx).
    /// The indexer decodes raw XDR and calls this to persist a human-readable record.
    pub fn submit_event(
        env:         Env,
        caller:      Address,
        contract_id: BytesN<32>,
        function:    Symbol,
        ledger:      u32,
        description: String,
        raw_topics:  Vec<String>,
        raw_data:    Bytes,
    ) {
        caller.require_auth();
        // Only the admin or an allowlisted indexer may submit events.
        Self::require_submitter(&env, &caller);

        // Guard against large blobs or descriptions bloating on-chain storage.
        if raw_data.len() > MAX_RAW_DATA_BYTES {
            panic_with_error!(&env, Error::LimitExceeded);
        }

        // Enforce a maximum description size to avoid unbounded rent growth.
        if description.len() as u32 > MAX_DESCRIPTION_LEN {
            panic_with_error!(&env, Error::LimitExceeded);
        }

        let seq: u64 = Self::event_seq(&env);
        let event = DecodedEvent {
            seq,
            contract_id: contract_id.clone(),
            function: function.clone(),
            ledger,
            description: description.clone(),
            raw_topics,
            raw_data,
        };

        env.events().publish(
            (symbol_short!("decoded"), contract_id, function),
            description,
        );

        env.storage().persistent().set(&DataKey::EventLog(seq), &event);
        env.storage().persistent().extend_ttl(&DataKey::EventLog(seq), EVENT_TTL_MIN, EVENT_TTL_MAX);
        env.storage().instance().set(&DataKey::EventSeq, &(seq + 1));
        Self::bump_ttl(&env);
    }

    /// Fetch a single decoded event by sequence number.
    pub fn get_event(env: Env, seq: u64) -> DecodedEvent {
        let key = DataKey::EventLog(seq);
        let event: DecodedEvent = env.storage().persistent()
            .get(&key)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotFound));
        env.storage().persistent().extend_ttl(&key, EVENT_TTL_MIN, EVENT_TTL_MAX);
        event
    }

    /// Return the total number of stored events.
    ///
    /// Panics with `NotInitialized` if the counter is absent, rather than
    /// reporting a misleading 0.
    pub fn event_count(env: Env) -> u64 {
        Self::event_seq(&env)
    }

    /// Fetch a page of events `[from, from+limit)`.
    ///
    /// `limit` is capped at [`MAX_PAGE`]; a larger value panics rather than
    /// burning the whole transaction's CPU budget on storage reads.
    pub fn get_events(env: Env, from: u64, limit: u32) -> Vec<DecodedEvent> {
        if limit > MAX_PAGE {
            panic_with_error!(&env, Error::LimitExceeded);
        }
        let total: u64 = env.storage().persistent().get(&DataKey::EventSeq).unwrap_or(0);
        let mut out: Vec<DecodedEvent> = Vec::new(&env);
        let end = from.saturating_add(limit as u64).min(total);
        for seq in from..end {
            if let Some(ev) = env.storage().persistent().get(&DataKey::EventLog(seq)) {
                out.push_back(ev);
            }
        }
        out
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{
            storage::{Instance as _, Persistent as _},
            Address as _, Events as _, Ledger as _,
        },
        Env, IntoVal, TryFromVal,
    };

    /// Expand into a `(Env, ExplorerContractClient<'_>)` binding in the caller's
    /// scope.  Using a macro rather than a function sidesteps the
    /// self-referential lifetime problem: `ExplorerContractClient<'env>` borrows
    /// from `env`, so both values must live in the *same* scope.  A function
    /// cannot express that relationship in its return type without resorting to
    /// the unsound `'static` annotation that issue #23 targets.
    macro_rules! setup {
        () => {{
            let env = Env::default();
            env.mock_all_auths();
            let id = env.register_contract(None, ExplorerContract);
            let client = ExplorerContractClient::new(&env, &id);
            (env, client)
        }};
    }

    #[test]
    fn test_init_and_register() {
        let (env, client) = setup!();
        let admin = Address::generate(&env);
        client.init(&admin);

        let cid: BytesN<32> = BytesN::from_array(&env, &[1u8; 32]);
        let meta = ContractMeta {
            name: String::from_str(&env, "StellarSwap"),
            description: String::from_str(&env, "DEX on Stellar"),
            functions: Vec::new(&env),
            registered_by: admin.clone(),
        };
        client.register_contract(&admin, &cid, &meta);
        let fetched = client.get_contract(&cid);
        assert_eq!(fetched.name, String::from_str(&env, "StellarSwap"));
    }

    #[test]
    fn test_submit_and_get_event() {
        let (env, client) = setup!();
        let admin = Address::generate(&env);
        client.init(&admin);

        let cid: BytesN<32> = BytesN::from_array(&env, &[2u8; 32]);
        client.submit_event(
            &admin,
            &cid,
            &symbol_short!("swap"),
            &4521983u32,
            &String::from_str(&env, "Address GABC... swapped 100 USDC → 98.7 XLM on StellarSwap"),
            &Vec::new(&env),
            &Bytes::new(&env),
        );

        let (_, topics, data) = env.events().all().last().unwrap();
        assert_eq!(
            topics,
            (symbol_short!("decoded"), cid.clone(), symbol_short!("swap")).into_val(&env),
        );
        assert_eq!(
            String::try_from_val(&env, &data).unwrap(),
            String::from_str(&env, "Address GABC... swapped 100 USDC → 98.7 XLM on StellarSwap"),
        );
        assert_eq!(client.event_count(), 1u64);
        let ev = client.get_event(&0u64);
        assert_eq!(ev.ledger, 4521983u32);
    }

    #[test]
    #[should_panic]
    fn test_double_init_panics() {
        let (env, client) = setup!();
        let admin = Address::generate(&env);
        client.init(&admin);
        client.init(&admin); // should panic
    }

    #[test]
    fn test_transfer_admin() {
        let (env, client) = setup!();
        let admin     = Address::generate(&env);
        let new_admin = Address::generate(&env);
        client.init(&admin);

        // Transfer admin rights to new_admin
        client.transfer_admin(&admin, &new_admin);

        // new_admin can now submit events; old admin cannot
        let cid: BytesN<32> = BytesN::from_array(&env, &[3u8; 32]);
        client.submit_event(
            &new_admin,
            &cid,
            &symbol_short!("test"),
            &1u32,
            &String::from_str(&env, "test event"),
            &Vec::new(&env),
            &Bytes::new(&env),
        );
        assert_eq!(client.event_count(), 1u64);
    }

    #[test]
    fn test_get_admin() {
        let (env, client) = setup!();
        let admin     = Address::generate(&env);
        let new_admin = Address::generate(&env);
        client.init(&admin);
        assert_eq!(client.get_admin(), admin);

        client.transfer_admin(&admin, &new_admin);
        assert_eq!(client.get_admin(), new_admin);
    }

    #[test]
    #[should_panic]
    fn test_get_admin_uninitialised_panics() {
        let (_env, client) = setup!();
        client.get_admin();
    }

    #[test]
    #[should_panic]
    fn test_event_count_uninitialised_panics() {
        let (_env, client) = setup!();
        client.event_count();
    }

    #[test]
    fn test_submit_event_max_raw_data_ok() {
        let (env, client) = setup!();
        let admin = Address::generate(&env);
        client.init(&admin);

        let cid: BytesN<32> = BytesN::from_array(&env, &[4u8; 32]);
        let mut raw = Bytes::new(&env);
        for _ in 0..MAX_RAW_DATA_BYTES {
            raw.push_back(0u8);
        }
        client.submit_event(
            &admin, &cid, &symbol_short!("swap"), &1u32,
            &String::from_str(&env, "at the limit"),
            &Vec::new(&env), &raw,
        );
        assert_eq!(client.event_count(), 1u64);
    }

    #[test]
    fn test_submit_event_max_description_len_ok() {
        let (env, client) = setup!();
        let admin = Address::generate(&env);
        client.init(&admin);

        let cid: BytesN<32> = BytesN::from_array(&env, &[6u8; 32]);
        let bytes = [b'a'; MAX_DESCRIPTION_LEN as usize];
        let description = String::from_str(&env, core::str::from_utf8(&bytes).unwrap());
        client.submit_event(
            &admin, &cid, &symbol_short!("swap"), &1u32,
            &description,
            &Vec::new(&env), &Bytes::new(&env),
        );
        assert_eq!(client.event_count(), 1u64);
    }

    #[test]
    #[should_panic]
    fn test_submit_event_oversized_description_panics() {
        let (env, client) = setup!();
        let admin = Address::generate(&env);
        client.init(&admin);

        let cid: BytesN<32> = BytesN::from_array(&env, &[7u8; 32]);
        let bytes = [b'a'; (MAX_DESCRIPTION_LEN + 1) as usize];
        let description = String::from_str(&env, core::str::from_utf8(&bytes).unwrap());
        client.submit_event(
            &admin, &cid, &symbol_short!("swap"), &1u32,
            &description,
            &Vec::new(&env), &Bytes::new(&env),
        );
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #4)")]
    fn test_submit_event_oversized_raw_data_panics() {
        let (env, client) = setup!();
        let admin = Address::generate(&env);
        client.init(&admin);

        let cid: BytesN<32> = BytesN::from_array(&env, &[5u8; 32]);
        let mut raw = Bytes::new(&env);
        for _ in 0..(MAX_RAW_DATA_BYTES + 1) {
            raw.push_back(0u8);
        }
        client.submit_event(
            &admin, &cid, &symbol_short!("swap"), &1u32,
            &String::from_str(&env, "one byte too many"),
            &Vec::new(&env), &raw,
        );
    }

    /// Build a `ContractMeta` with `n` functions, each carrying `params` params.
    fn meta_with(env: &Env, admin: &Address, n: u32, params: u32) -> ContractMeta {
        let mut functions: Vec<FunctionAbi> = Vec::new(env);
        for _ in 0..n {
            let mut p: Vec<ParamDef> = Vec::new(env);
            for _ in 0..params {
                p.push_back(ParamDef {
                    name: symbol_short!("amount"),
                    kind: ParamKind::I128,
                });
            }
            functions.push_back(FunctionAbi {
                name:        symbol_short!("swap"),
                description: String::from_str(env, "swap"),
                params:      p,
            });
        }
        ContractMeta {
            name:          String::from_str(env, "StellarSwap"),
            description:   String::from_str(env, "DEX on Stellar"),
            functions,
            registered_by: admin.clone(),
        }
    }

    #[test]
    fn test_register_contract_at_abi_limits_ok() {
        let (env, client) = setup!();
        let admin = Address::generate(&env);
        client.init(&admin);

        let cid: BytesN<32> = BytesN::from_array(&env, &[6u8; 32]);
        let meta = meta_with(&env, &admin, MAX_FUNCTIONS, MAX_PARAMS);
        client.register_contract(&admin, &cid, &meta);
        assert_eq!(client.get_contract(&cid).functions.len(), MAX_FUNCTIONS);
    }

    #[test]
    #[should_panic]
    fn test_register_contract_too_many_functions_panics() {
        let (env, client) = setup!();
        let admin = Address::generate(&env);
        client.init(&admin);

        let cid: BytesN<32> = BytesN::from_array(&env, &[7u8; 32]);
        let meta = meta_with(&env, &admin, MAX_FUNCTIONS + 1, 0);
        client.register_contract(&admin, &cid, &meta);
    }

    #[test]
    #[should_panic]
    fn test_register_contract_too_many_params_panics() {
        let (env, client) = setup!();
        let admin = Address::generate(&env);
        client.init(&admin);

        let cid: BytesN<32> = BytesN::from_array(&env, &[8u8; 32]);
        let meta = meta_with(&env, &admin, 1, MAX_PARAMS + 1);
        client.register_contract(&admin, &cid, &meta);
    }

    #[test]
    fn test_get_contracts_returns_registered_ids() {
        let (env, client) = setup!();
        let admin = Address::generate(&env);
        client.init(&admin);

        let cid_1: BytesN<32> = BytesN::from_array(&env, &[10u8; 32]);
        let cid_2: BytesN<32> = BytesN::from_array(&env, &[11u8; 32]);
        let meta_1 = meta_with(&env, &admin, 1, 1);
        let meta_2 = meta_with(&env, &admin, 2, 1);

        client.register_contract(&admin, &cid_1, &meta_1);
        client.register_contract(&admin, &cid_2, &meta_2);

        let ids = client.get_contracts();
        assert_eq!(ids.len(), 2);
        assert_eq!(ids.get(0).unwrap(), cid_1);
        assert_eq!(ids.get(1).unwrap(), cid_2);
    }

    #[test]
    #[should_panic]
    fn test_update_contract_too_many_functions_panics() {
        let (env, client) = setup!();
        let admin = Address::generate(&env);
        client.init(&admin);

        let cid: BytesN<32> = BytesN::from_array(&env, &[9u8; 32]);
        client.register_contract(&admin, &cid, &meta_with(&env, &admin, 1, 1));
        client.update_contract(&admin, &cid, &meta_with(&env, &admin, MAX_FUNCTIONS + 1, 0));
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #2)")]
    fn test_transfer_admin_wrong_caller_panics() {
        let (env, client) = setup!();
        let admin    = Address::generate(&env);
        let attacker = Address::generate(&env);
        client.init(&admin);
        // attacker tries to hijack admin — must panic
        client.transfer_admin(&attacker, &attacker);
    }

    #[test]
    #[should_panic]
    fn test_transfer_admin_requires_auth() {
        let (env, client) = setup!();
        let admin = Address::generate(&env);
        let new_admin = Address::generate(&env);
        client.init(&admin);

        env.set_auths(&[]);
        client.transfer_admin(&admin, &new_admin);
    }

    #[test]
    #[should_panic]
    fn test_submit_event_requires_auth() {
        let (env, client) = setup!();
        let admin = Address::generate(&env);
        client.init(&admin);

        env.set_auths(&[]);
        let cid: BytesN<32> = BytesN::from_array(&env, &[12u8; 32]);
        client.submit_event(
            &admin,
            &cid,
            &symbol_short!("swap"),
            &1u32,
            &String::from_str(&env, "must require authorization"),
            &Vec::new(&env),
            &Bytes::new(&env),
        );
    }

    #[test]
    #[should_panic]
    fn test_add_indexer_requires_admin_auth() {
        let (env, client) = setup!();
        let admin = Address::generate(&env);
        let indexer = Address::generate(&env);
        client.init(&admin);

        env.set_auths(&[]);
        client.add_indexer(&admin, &indexer);
    }

    // ── #1 — init is permanently irreversible ────────────────────────────────

    /// The admin guard must not live in instance storage.
    ///
    /// Wiping the instance `Admin` slot models the entry lapsing; a second
    /// `init` still has to fail because the real guard is persistent.  Against
    /// the old instance-storage implementation this test fails: `init` would
    /// succeed and hand the contract to `attacker`.
    #[test]
    #[should_panic(expected = "Error(Contract, #3)")]
    fn test_init_is_irreversible_without_instance_entry() {
        let (env, client) = setup!();
        let id = client.address.clone();

        let admin    = Address::generate(&env);
        let attacker = Address::generate(&env);
        client.init(&admin);

        env.as_contract(&id, || {
            env.storage().instance().remove(&DataKey::Admin);
        });

        client.init(&attacker); // must still panic — admin is persistent
    }

    /// Every mutating entry point bumps the instance TTL, so an actively used
    /// contract never lets its state lapse in the first place.
    #[test]
    fn test_mutating_calls_bump_ttl() {
        let (env, client) = setup!();
        let admin = Address::generate(&env);
        client.init(&admin);

        let start = env.ledger().sequence();
        env.ledger().with_mut(|l| l.sequence_number = start + 100_000);

        let cid: BytesN<32> = BytesN::from_array(&env, &[4u8; 32]);
        client.submit_event(
            &admin,
            &cid,
            &symbol_short!("swap"),
            &1u32,
            &String::from_str(&env, "keeps the instance alive"),
            &Vec::new(&env),
            &Bytes::new(&env),
        );

        // TTL was pushed well past the 30-day bump threshold.
        let ttl = env.as_contract(&client.address, || env.storage().instance().get_ttl());
        assert!(ttl >= TTL_THRESHOLD, "instance ttl {} not bumped", ttl);
    }

    #[test]
    fn test_event_seq_survives_instance_ttl_expiry() {
        let (env, client) = setup!();
        let admin = Address::generate(&env);
        client.init(&admin);

        let cid: BytesN<32> = BytesN::from_array(&env, &[14u8; 32]);
        client.submit_event(
            &admin,
            &cid,
            &symbol_short!("swap"),
            &1u32,
            &String::from_str(&env, "first event"),
            &Vec::new(&env),
            &Bytes::new(&env),
        );

        // Model the instance entry expiring while the persistent counter remains.
        env.as_contract(&client.address, || {
            env.storage().instance().remove(&DataKey::EventSeq);
        });

        client.submit_event(
            &admin,
            &cid,
            &symbol_short!("swap"),
            &2u32,
            &String::from_str(&env, "second event"),
            &Vec::new(&env),
            &Bytes::new(&env),
        );

        assert_eq!(client.event_count(), 2u64);
        assert_eq!(client.get_event(&0u64).seq, 0u64);
        assert_eq!(client.get_event(&1u64).seq, 1u64);
    }

    // ── #2 — indexer allowlist ───────────────────────────────────────────────

    #[test]
    fn test_allowlisted_indexer_can_submit() {
        let (env, client) = setup!();
        let admin   = Address::generate(&env);
        let indexer = Address::generate(&env);
        client.init(&admin);
        client.add_indexer(&admin, &indexer);

        assert!(client.is_indexer(&indexer));
        assert_eq!(client.get_indexers().len(), 1);

        let cid: BytesN<32> = BytesN::from_array(&env, &[7u8; 32]);
        client.submit_event(
            &indexer,
            &cid,
            &symbol_short!("swap"),
            &42u32,
            &String::from_str(&env, "indexer submitted"),
            &Vec::new(&env),
            &Bytes::new(&env),
        );
        assert_eq!(client.event_count(), 1u64);
    }

    #[test]
    #[should_panic]
    fn test_removed_indexer_cannot_submit() {
        let (env, client) = setup!();
        let admin   = Address::generate(&env);
        let indexer = Address::generate(&env);
        client.init(&admin);
        client.add_indexer(&admin, &indexer);
        client.remove_indexer(&admin, &indexer);
        assert!(!client.is_indexer(&indexer));

        let cid: BytesN<32> = BytesN::from_array(&env, &[8u8; 32]);
        client.submit_event(
            &indexer,
            &cid,
            &symbol_short!("swap"),
            &1u32,
            &String::from_str(&env, "should fail"),
            &Vec::new(&env),
            &Bytes::new(&env),
        );
    }

    #[test]
    #[should_panic]
    fn test_non_admin_cannot_add_indexer() {
        let (env, client) = setup!();
        let admin    = Address::generate(&env);
        let attacker = Address::generate(&env);
        client.init(&admin);
        client.add_indexer(&attacker, &attacker);
    }

    // ── #3 — get_events page cap ─────────────────────────────────────────────

    #[test]
    #[should_panic]
    fn test_get_events_rejects_oversized_limit() {
        let (env, client) = setup!();
        let admin = Address::generate(&env);
        client.init(&admin);
        client.get_events(&0u64, &u32::MAX);
    }

    #[test]
    fn test_get_events_accepts_max_page() {
        let (env, client) = setup!();
        let admin = Address::generate(&env);
        client.init(&admin);
        assert_eq!(client.get_events(&0u64, &MAX_PAGE).len(), 0);
    }

    #[test]
    fn test_get_events_limit_zero_returns_empty() {
        let (env, client) = setup!();
        let admin = Address::generate(&env);
        client.init(&admin);
        let cid: BytesN<32> = BytesN::from_array(&env, &[15u8; 32]);
        client.submit_event(
            &admin,
            &cid,
            &symbol_short!("swap"),
            &1u32,
            &String::from_str(&env, "event"),
            &Vec::new(&env),
            &Bytes::new(&env),
        );

        assert_eq!(client.get_events(&0u64, &0u32).len(), 0);
    }

    #[test]
    fn test_get_events_from_equals_total_returns_empty() {
        let (env, client) = setup!();
        let admin = Address::generate(&env);
        client.init(&admin);
        let cid: BytesN<32> = BytesN::from_array(&env, &[16u8; 32]);
        client.submit_event(
            &admin,
            &cid,
            &symbol_short!("swap"),
            &1u32,
            &String::from_str(&env, "event"),
            &Vec::new(&env),
            &Bytes::new(&env),
        );

        assert_eq!(client.get_events(&1u64, &MAX_PAGE).len(), 0);
    }

    #[test]
    fn test_get_events_from_last_returns_one() {
        let (env, client) = setup!();
        let admin = Address::generate(&env);
        client.init(&admin);
        let cid: BytesN<32> = BytesN::from_array(&env, &[17u8; 32]);
        for ledger in 1..=2 {
            client.submit_event(
                &admin,
                &cid,
                &symbol_short!("swap"),
                &ledger,
                &String::from_str(&env, "event"),
                &Vec::new(&env),
                &Bytes::new(&env),
            );
        }

        let events = client.get_events(&1u64, &MAX_PAGE);
        assert_eq!(events.len(), 1);
        assert_eq!(events.get(0).unwrap().seq, 1u64);
    }

    // ── #4 — update_contract emits an event ──────────────────────────────────

    #[test]
    fn test_update_contract_emits_event() {
        let (env, client) = setup!();
        let admin = Address::generate(&env);
        client.init(&admin);

        let cid: BytesN<32> = BytesN::from_array(&env, &[9u8; 32]);
        let meta = ContractMeta {
            name: String::from_str(&env, "StellarSwap"),
            description: String::from_str(&env, "DEX on Stellar"),
            functions: Vec::new(&env),
            registered_by: admin.clone(),
        };
        client.register_contract(&admin, &cid, &meta);

        let updated = ContractMeta {
            name: String::from_str(&env, "StellarSwap v2"),
            ..meta
        };
        client.update_contract(&admin, &cid, &updated);

        let (_, topics, data) = env.events().all().last().unwrap();
        assert_eq!(
            topics,
            (symbol_short!("update"), cid.clone()).into_val(&env),
        );
        assert_eq!(
            String::try_from_val(&env, &data).unwrap(),
            String::from_str(&env, "StellarSwap v2"),
        );
        assert_eq!(client.get_contract(&cid).name, String::from_str(&env, "StellarSwap v2"));
    }
}
