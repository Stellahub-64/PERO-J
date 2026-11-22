#![no_main]

use libfuzzer_sys::fuzz_target;
use soroban_sdk::{testutils::Address as _, Address, Bytes, Env, String};

use explorer::ExplorerContract;

fuzz_target!(|data: &[u8]| {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, ExplorerContract);
    let client = ExplorerContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let caller = Address::generate(&env);

    // Initialize the contract; ignore errors so fuzzing continues on edge inputs.
    let _ = client.try_initialize(&admin);

    // Exercise the allowlist path: register the caller as an indexer so
    // submit_event authorization accepts admin OR any allowlisted address.
    let _ = client.try_add_indexer(&admin, &caller);

    // Derive arbitrary description and raw_data sizes from the fuzz input.
    let split = if data.is_empty() { 0 } else { data[0] as usize % (data.len() + 1) };
    let (desc_bytes, raw_bytes) = data.split_at(split);

    let description = String::from_bytes(&env, desc_bytes);
    let raw_data = Bytes::from_slice(&env, raw_bytes);

    // Expected contract errors (e.g. length limits) must be handled, not unwrapped.
    let _ = client.try_submit_event(&caller, &description, &raw_data);
});
