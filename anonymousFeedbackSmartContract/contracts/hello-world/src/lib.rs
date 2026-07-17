#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Env, String, Symbol, vec, Vec};

// Geri bildirim verilerini tutacak yapı
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FeedbackItem {
    pub msg: String,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    // Frontend uygulamanın tam olarak aradığı fonksiyon!
    pub fn send_feedback(env: Env, feedback_msg: String) {
        // Basitçe gelen mesajı bir log/olay olarak ağa fırlatıyoruz (Anonymous Event)
        // Eğer projenin ilerleyen adımlarında state kaydı gerekirse burayı genişletebilirsin
        env.events().publish(
            (Symbol::new(&env, "feedback"),),
            FeedbackItem { msg: feedback_msg }
        );
    }

    // Geri bildirim kontrol fonksiyonu (Arayüzde sağ taraftaki buton için gerekebilir)
    pub fn get_feedback(env: Env) -> Vec<String> {
        vec![&env, String::from_str(&env, "Geri bildirim başarıyla işlendi")]
    }
}

mod test;