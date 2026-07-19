#![cfg(test)]
use super::{Contract, ContractClient};
use soroban_sdk::{Env, String};

#[test]
fn test_create_and_fetch_feedback() {
    //Test 1: Is the feedback being successfully recorded and retrieved?
    let env = Env::default();
    let contract_id = env.register_contract(None, Contract);
    let client = ContractClient::new(&env, &contract_id);

    let feedback_text = String::from_str(&env, "Harika bir dApp olmus!");
    let feedback_id = client.create_feedback(&feedback_text);

    let fetched_feedback = client.fetch_feedback(&feedback_id);
    assert_eq!(fetched_feedback, feedback_text);
}

#[test]
fn test_unique_feedback_ids() {
    // Test 2: Is a different and unique ID generated for each new piece of feedback submitted?
    let env = Env::default();
    let contract_id = env.register_contract(None, Contract);
    let client = ContractClient::new(&env, &contract_id);

    let f1 = String::from_str(&env, "Birinci Feedback");
    let f2 = String::from_str(&env, "Ikinci Feedback");

    let id1 = client.create_feedback(&f1);
    let id2 = client.create_feedback(&f2);

    assert_ne!(id1, id2);
}

#[test]
fn test_empty_feedback_handling() {
   // Test 3: Does the contract handle it correctly when an empty response is sent?
    let env = Env::default();
    let contract_id = env.register_contract(None, Contract);
    let client = ContractClient::new(&env, &contract_id);

    let empty_text = String::from_str(&env, "");
    let feedback_id = client.create_feedback(&empty_text);

    let fetched = client.fetch_feedback(&feedback_id);
    assert_eq!(fetched, empty_text);
}