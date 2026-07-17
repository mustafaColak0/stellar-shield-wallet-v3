#![cfg(test)]

use super::*;
use soroban_sdk::{contractimport, Env};

#[test]
fn test_fetch_feedback() {
    let env = Env::default();
    let contract_id = env.register_contract(None, Anonymousfeedback);
    let client = AnonymousfeedbackClient::new(&env, &contract_id);

    let fb_id = 1;
    let message = String::from_str(&env, "Feedback message");

    client.send_feedback(&message); 

    let feedback = client.fetch_feedback(&fb_id); //

    assert_eq!(feedback.fb_id, fb_id);
    assert!(feedback.message == message); 

#[test]
fn test_send_feedback() {
    let env = Env::default();
    let contract_id = env.register_contract(None, Anonymousfeedback);
    let client = AnonymousfeedbackClient::new(&env, &contract_id);

    let message = String::from_str(&env, "Feedback message");
    let new_feedback = client.send_feedback(&message);

    assert!(new_feedback == 1);
}