module my_addrx::GuessingGame {

    use std::debug;
    use std::signer;
    //use std::account;
    use std::hash::sha3_256;
    use std::simple_map::{Self, SimpleMap};

    // Constants
    const E_QUESTION_DOES_NOT_EXIST: u64 = 101;
    const E_ANSWER_DOES_NOT_EXIST: u64 = 102;
    const E_CALLER_NOT_OWNER: u64 = 103;
    const E_QNA_NOT_INITIALIZED: u64 = 104;
    const E_QNA_ALREADY_INITIALIZED: u64 = 105;
    const E_QUESTION_ALREADY_EXIST: u64 = 106;

    struct Qna has key {
        qna_list: SimpleMap<vector<u8>, vector<u8>>,
        //questions_hash: vector<u8>,
        points: SimpleMap<address, u8>
    }

    public fun only_owner(addr:address) {
        assert!(addr==@my_addrx, E_CALLER_NOT_OWNER);
    }

    // public fun assert_is_initialized(addr:address) {
    //     assert!(exists<Qna>(addr), E_QNA_NOT_INITIALIZED);
    // }

    public fun assert_is_initialized() {
        assert!(exists<Qna>(@my_addrx), E_QNA_NOT_INITIALIZED);
    }

    public fun assert_is_uninitialized() {
        assert!(!exists<Qna>(@my_addrx), E_QNA_ALREADY_INITIALIZED);
    }

    public fun assert_contains_key(qmap: &SimpleMap<vector<u8>, vector<u8>>, qhash:&vector<u8>) {
        assert!(simple_map::contains_key(qmap, qhash), E_QUESTION_DOES_NOT_EXIST);
    }

    public fun assert_not_contains_key(qmap: &SimpleMap<vector<u8>, vector<u8>>, qhash:&vector<u8>) {
        assert!(!simple_map::contains_key(qmap, qhash), E_QUESTION_ALREADY_EXIST);
    }

    public entry fun initialize(acc: &signer) {
        
        // get address of caller
        let addr = signer::address_of(acc);
        
        // assert caller is owner
        only_owner(addr);

        // assert resource is not already initialized
        assert_is_uninitialized();

        let qnalist = Qna {
            qna_list: simple_map::create(),
            points: simple_map::create()
        };

        move_to(acc, qnalist);

    }

    // public entry fun insert_qna_hashes(acc: &signer, question:vector<u8>, answer:vector<u8>) {

    //     assert_is_initialized();

    //     // todo: how to prevent empty strings
        
    //     // get address of caller
    //     let addr = signer::address_of(acc);

    //     // assert caller is owner
    //     only_owner(addr);

    //     let qna = borrow_global_mut<Qna>(addr);

    //     let qhash:vector<u8> = hashify(&question);
    //     let ahash:vector<u8> = hashify(&answer);
        
    //     assert_not_contains_key(&qna.qna_list, &qhash);

    //     simple_map::add(&mut qna.qna_list, qhash, ahash);

    // }

    public fun insert_qna_hashes(question:&vector<u8>, answer:&vector<u8>) acquires Qna {

        assert_is_initialized();

        // todo: how to prevent empty strings

        let qna = borrow_global_mut<Qna>(@my_addrx);

        let qhash:vector<u8> = hashify(question);
        let ahash:vector<u8> = hashify(answer);
        
        assert_not_contains_key(&qna.qna_list, &qhash);

        simple_map::add(&mut qna.qna_list, qhash, ahash);

    }

    // public fun correct_answer(acc: &signer, qhash:vector<u8>, user_ans_hash:vector<u8>):bool acquires Qna {
    //     // get address of caller
    //     let addr = signer::address_of(acc);
    //     let qna = borrow_global<Qna>(addr); 
    //     let ans = simple_map::borrow(&qna.qna_list, &qhash);
    //     ans == &user_ans_hash
    // }

    public fun correct_answer(qhash:vector<u8>, user_ans_hash:vector<u8>):bool acquires Qna {
        let qna = borrow_global<Qna>(@my_addrx); 
        let ans = simple_map::borrow(&qna.qna_list, &qhash);
        ans == &user_ans_hash
    }

    fun hashify(data:&vector<u8>):vector<u8> {
        sha3_256(*data)
    }

    #[test(admin = @my_addrx)]
    public fun test_flow(admin: signer) acquires Qna {

        let addr = signer::address_of(&admin);

        // let user1 = account::create_account_for_test(@0x3);
        // let user2 = account::create_account_for_test(@0x4);

        initialize(&admin);
        
        let q1:vector<u8> = b"What is at the end of the rainbow?";
        let q1hash = hashify(&q1);
        let q2:vector<u8> = b"What word is always spelled wrong?";
        let q2hash = hashify(&q2);

        let a1: vector<u8> = b"w";
        let a2: vector<u8> = b"wrong";

        insert_qna_hashes(&q1, &a1);
        insert_qna_hashes(&q2, &a2);

        let qna = borrow_global<Qna>(addr);
        
        let correct_answer_1= simple_map::borrow(&qna.qna_list, &q1hash);
        debug::print(correct_answer_1);

        let correct_answer_2= simple_map::borrow(&qna.qna_list, &q2hash);
        debug::print(correct_answer_2);


    }

}