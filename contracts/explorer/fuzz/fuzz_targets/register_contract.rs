#![no_main]

use libfuzzer_sys::fuzz_target;
use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

use explorer::contract::{Contract, ContractClient};

fuzz_target!(|data: &[u8]| {
    // Need at least a few bytes to derive function/param counts.
    if data.len() < 2 {
        return;
    }

    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, Contract);
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);

    // Derive arbitrary function counts and param counts from the fuzz input.
    let function_count = (data[0] as usize) % 16;
    let param_count = (data[1] as usize) % 16;

    let mut functions: Vec<String> = Vec::new(&env);
    for i in 0..function_count {
        // Build a function name from the remaining bytes, bounded in length.
        let name = build_string(&env, data, i);
        functions.push_back(name);
    }

    let mut params: Vec<String> = Vec::new(&env);
    for i in 0..param_count {
        let param = build_string(&env, data, i + function_count);
        params.push_back(param);
    }

    // The contract may legitimately reject edge-case inputs; we only care that
    // it does not panic/crash. Errors are expected and ignored.
    let _ = client.try_register_contract(&admin, &functions, &params);
});

/// Build a bounded-length string from the fuzz input, seeded by `seed`.
fn build_string(env: &Env, data: &[u8], seed: usize) -> String {
    let len = (data[seed % data.len()] as usize) % 64;
    let mut bytes = [0u8; 64];
    for (i, b) in bytes.iter_mut().enumerate().take(len) {
        *b = data[(seed + i) % data.len()];
    }
    String::from_bytes(env, &bytes[..len])
}
