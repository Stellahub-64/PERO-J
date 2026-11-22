#![no_main]

use arbitrary::Arbitrary;
use libfuzzer_sys::fuzz_target;
use soroban_sdk::{
    testutils::Address as _,
    Address, Bytes, BytesN, Env, String, Vec,
    symbol_short,
};
use soroban_explorer_contract::{ExplorerContract, ExplorerContractClient, MAX_PAGE};

#[derive(Arbitrary, Debug)]
struct GetEventsInput {
    from: u64,
    limit: u32,
}

fuzz_target!(|input: GetEventsInput| {
    let env = Env::default();
    env.mock_all_auths();

    let id = env.register_contract(None, ExplorerContract);
    let client = ExplorerContractClient::new(&env, &id);

    let admin = Address::generate(&env);
    client.init(&admin);

    let total = 100u64;
    for i in 0..total {
        let cid: BytesN<32> = BytesN::from_array(&env, &[i as u8; 32]);
        client.submit_event(
            &admin,
            &cid,
            &symbol_short!("test"),
            &(i as u32),
            &String::from_str(&env, "test event"),
            &Vec::new(&env),
            &Bytes::new(&env),
        );
    }

    // `limit` above MAX_PAGE is rejected by the contract, so fuzz the accepted range.
    let limit = input.limit % (MAX_PAGE + 1);
    let result = client.get_events(&input.from, &limit);

    assert!(
        result.len() <= limit as usize,
        "result length {} exceeds limit {}",
        result.len(),
        limit
    );

    if input.from < total {
        let max_len = (total - input.from) as usize;
        assert!(
            result.len() <= max_len,
            "result length {} exceeds total - from {}",
            result.len(),
            max_len
        );
    } else {
        assert!(
            result.len() == 0,
            "result should be empty when from >= total"
        );
    }
});

#[cfg(test)]
mod tests {
    use super::*;

    fn setup() -> (Env, ExplorerContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();

        let id = env.register_contract(None, ExplorerContract);
        let client = ExplorerContractClient::new(&env, &id);

        let admin = Address::generate(&env);
        client.init(&admin);

        (env, client)
    }

    #[test]
    fn get_events_accepts_limit_at_max_page() {
        let (_env, client) = setup();
        let result = client.get_events(&0, &MAX_PAGE);
        assert!(result.len() <= MAX_PAGE as usize);
    }

    #[test]
    #[should_panic]
    fn get_events_panics_when_limit_exceeds_max_page() {
        let (_env, client) = setup();
        client.get_events(&0, &(MAX_PAGE + 1));
    }
}
