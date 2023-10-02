module my_addrx::GuessingGame {

    use std::signer;
    use std::vector;
    use std::hash::sha3_256;
    use std::simple_map::{Self, SimpleMap};
    use std::string::{String,bytes}; 
    #[test_only]
    use std::account;
    use std::string::utf8;

    // Constants
    const E_QUESTION_DOES_NOT_EXIST: u64 = 101;
    const E_ANSWER_DOES_NOT_EXIST: u64 = 102;
    const E_CALLER_NOT_OWNER: u64 = 103;
    const E_QNA_NOT_INITIALIZED: u64 = 104;
    const E_QNA_ALREADY_INITIALIZED: u64 = 105;
    const E_QUESTION_ALREADY_EXIST: u64 = 106;
    const E_USER_ALREADY_ANSWERED: u64 = 107;
    const E_CALLER_NOT_ANSWERED_YET: u64 = 108;

    struct Qna has key {
        qna_list: SimpleMap<String, vector<u8>>,
        points: SimpleMap<address, u16>,
        user_correct_responses: SimpleMap<address, vector<String>>
    }

    public fun only_owner(addr:address) {
        assert!(addr==@my_addrx, E_CALLER_NOT_OWNER);
    }

    public fun assert_is_initialized(store_addr:address) {
        assert!(exists<Qna>(store_addr), E_QNA_NOT_INITIALIZED);
    }

    public fun assert_is_uninitialized(store_addr:address) {
        assert!(!exists<Qna>(store_addr), E_QNA_ALREADY_INITIALIZED);
    }

    public fun assert_contains_key(qmap: &SimpleMap<String, vector<u8>>, qhash:&String) {
        assert!(simple_map::contains_key(qmap, qhash), E_QUESTION_DOES_NOT_EXIST);
    }

    public fun assert_not_contains_key(qmap: &SimpleMap<String, vector<u8>>, qhash:&String) {
        assert!(!simple_map::contains_key(qmap, qhash), E_QUESTION_ALREADY_EXIST);
    }

    public entry fun initialize(acc: &signer) {
        
        // get address of caller
        let addr = signer::address_of(acc);
        
        // assert caller is owner
        only_owner(addr);

        // assert resource is not already initialized
        assert_is_uninitialized(addr);

        let qnalist = Qna {
            qna_list: simple_map::create(),
            points: simple_map::create(),
            user_correct_responses: simple_map::create(),
        };

        move_to(acc, qnalist);

    }

    public entry fun insert_qna_hashes(store_addr:address, question:String, answer:String) acquires Qna {

        assert_is_initialized(store_addr);

        // todo: how to prevent empty strings

        let qna = borrow_global_mut<Qna>(store_addr);

        let ahash:vector<u8> = hashify(&answer);
        
        assert_not_contains_key(&qna.qna_list, &question);

        simple_map::add(&mut qna.qna_list, question, ahash);

    }
    
    public entry fun insert_answer(caller:&signer, store_addr:address, question:String, answer:String) acquires Qna {

        assert_is_initialized(store_addr);

        let addr:address = signer::address_of(caller);

        let qna = borrow_global_mut<Qna>(store_addr);

        let ahash:vector<u8> = hashify(&answer);
        
        assert_contains_key(&qna.qna_list, &question);

        if(!simple_map::contains_key(&qna.points, &addr)) {
            simple_map::add(&mut qna.points, addr, 0);
        };

        if(!simple_map::contains_key(&qna.user_correct_responses, &addr)) {
            simple_map::add(&mut qna.user_correct_responses, addr, vector::empty<String>());
        };

        let user_correct_response_list = simple_map::borrow(&qna.user_correct_responses, &addr);
        assert!(!vector::contains(user_correct_response_list, &question), E_USER_ALREADY_ANSWERED);

        if(is_answer_correct(qna, question, ahash)) {
            // add points to caller
            let user_points:&mut u16 = simple_map::borrow_mut(&mut qna.points, &addr);
            *user_points = *user_points + 10u16;

            // add question to correctly_answered list
            let user_correct_response_list = simple_map::borrow_mut(&mut qna.user_correct_responses, &addr);
            vector::push_back(user_correct_response_list, question);
        };

    }

    #[view]
    public fun get_user_points(addr:address, store_addr:address):u16 acquires Qna {
        assert_is_initialized(store_addr);
        let qna = borrow_global_mut<Qna>(store_addr);
        assert!(simple_map::contains_key(&qna.points, &addr), E_CALLER_NOT_ANSWERED_YET);
        let user_points:&u16 = simple_map::borrow(&mut qna.points, &addr);
        *user_points
    }

    fun is_answer_correct(qna:&Qna, quest:String, user_ans_hash:vector<u8>):bool  {
        let ans = simple_map::borrow(&qna.qna_list, &quest);
        ans == &user_ans_hash
    }

    public fun hashify(data:&String):vector<u8> {
        let hash:&vector<u8> = bytes(data);
        sha3_256(*hash)
    }

    #[test(admin = @my_addrx)]
    public fun test_flow(admin: signer) acquires Qna {

        let store = signer::address_of(&admin);
        let user1 = account::create_account_for_test(@0x3);
        let user1addr:address = signer::address_of(&user1);
        let user2 = account::create_account_for_test(@0x4);
        let user2addr:address = signer::address_of(&user2);

        initialize(&admin);
        
        let q1:String= utf8(b"What is at the end of the rainbow?");
        let q2:String = utf8(b"What word is always spelled wrong?");

        let a1: String = utf8(b"w");
        let a1hash = hashify(&a1);
        let a2: String = utf8(b"wrong");
        let a2hash = hashify(&a2);

        insert_qna_hashes(store, q1, a1);
        insert_qna_hashes(store, q2, a2);

        let qna = borrow_global<Qna>(store);
        
        let correct_answer_1= simple_map::borrow(&qna.qna_list, &q1);
        assert!(correct_answer_1==&a1hash, 301);

        let correct_answer_2= simple_map::borrow(&qna.qna_list, &q2);
        assert!(correct_answer_2==&a2hash, 302);

        let user1_answer1:String = utf8(b"w");
        let user1_ans1_hash = hashify(&user1_answer1);
        
        let is_user_answer_correct = is_answer_correct(qna, q1, user1_ans1_hash);

        assert!(is_user_answer_correct==true, 201);

        insert_answer(&user1, store, q1, user1_answer1);

        let user1_points = get_user_points(user1addr, store);

        assert!(user1_points==10, 202);

        let user2_answer1 = utf8(b"w");

        let user2_answer2 = utf8(b"wrong");

        insert_answer(&user2, store, q1, user2_answer1);

        let user2_points = get_user_points(user1addr, store);

        assert!(user2_points==10, 203);

        insert_answer(&user2, store, q2, user2_answer2);

        user2_points = get_user_points(user2addr, store);

        assert!(user2_points==20, 204);

    }

    #[test(admin = @0x123)]
    #[expected_failure(abort_code = E_CALLER_NOT_OWNER)]
    public entry fun test_initialize_owner(admin:signer) {
        initialize(&admin);
    }

    #[test(admin = @my_addrx)]
    #[expected_failure(abort_code = E_QNA_ALREADY_INITIALIZED)]
    public entry fun test_initialize_module_already_initialized(admin:signer) {
        initialize(&admin);
        initialize(&admin);
    }

    #[test(admin = @my_addrx)]
    #[expected_failure(abort_code = E_QNA_NOT_INITIALIZED)]
    public entry fun test_insert_qna_module_is_uninitialized() acquires Qna {
        let store:address = @my_addrx;
        let q1:String = utf8(b"What is at the end of the rainbow?");
        let a1: String = utf8(b"w");
        insert_qna_hashes(store, q1, a1);
    }

    #[test(admin = @my_addrx)]
    #[expected_failure(abort_code = E_QUESTION_ALREADY_EXIST)]
    public entry fun test_insert_qna_module_prevent_duplicate_question(admin:signer) acquires Qna {
        initialize(&admin);
        let store:address = @my_addrx;
        let q1:String = utf8(b"What is at the end of the rainbow?");
        let a1: String = utf8(b"w");
        insert_qna_hashes(store, q1, a1);
        insert_qna_hashes(store, q1, a1);
    }

    #[test(admin = @my_addrx, user1=@0x123)]
    #[expected_failure(abort_code = E_QUESTION_DOES_NOT_EXIST)]
    public entry fun test_insert_qna_module_question_must_exist_for_answers(admin:signer, user1:signer) acquires Qna {
        account::create_account_for_test(signer::address_of(&user1));
        initialize(&admin);
        let store:address = @my_addrx;
        let q1:String = utf8(b"What is at the end of the rainbow?");
        let q2:String = utf8(b"Non existing question?");
        let a1: String = utf8(b"w");
        insert_qna_hashes(store, q1, a1);
        insert_answer(&user1, store, q2, a1);
    }

    #[test(admin = @my_addrx)]
    #[expected_failure(abort_code = E_QNA_NOT_INITIALIZED)]
    public fun test_get_user_points_assert_initialized() acquires Qna {
        let store:address = @my_addrx;
        let user = account::create_account_for_test(@0x2);
        let user_addr = signer::address_of(&user);
        let user2_points = get_user_points(user_addr, store);
        assert!(user2_points==0, 205);
    }

    #[test(admin = @my_addrx)]
    #[expected_failure(abort_code = E_CALLER_NOT_ANSWERED_YET)]
    public fun test_get_user_points(admin:signer) acquires Qna {
        let user = account::create_account_for_test(@0x2);
        let user_addr = signer::address_of(&user);
        let store = signer::address_of(&admin);
        initialize(&admin);
        
        get_user_points(user_addr, store);
        
    }

    #[test(admin = @my_addrx)]
    #[expected_failure(abort_code = E_USER_ALREADY_ANSWERED)]
    public fun test_prevent_user_to_answer_twice_correctly(admin:signer) acquires Qna {
        let user = account::create_account_for_test(@0x2);
        let user_addr = signer::address_of(&user);
        let store = signer::address_of(&admin);
        initialize(&admin);

        let q1:String = utf8(b"What is at the end of the rainbow?");

        let a1: String = utf8(b"w");

        insert_qna_hashes(store, q1, a1);
        
        let qna = borrow_global<Qna>(store);

        let user1_answer1 = utf8(b"w");
        let user1_ans1_hash = hashify(&user1_answer1);
        
        let is_user_answer_correct = is_answer_correct(qna, q1, user1_ans1_hash);

        assert!(is_user_answer_correct==true, 201);

        insert_answer(&user, store, q1, user1_answer1);

        let user1_points = get_user_points(user_addr, store);

        assert!(user1_points==10, 202);

        insert_answer(&user, store, q1, user1_answer1);
        
    }

    #[test(admin = @my_addrx)]
    public fun test_no_error_if_user_answered_incorrectly(admin:signer) acquires Qna {
        let user = account::create_account_for_test(@0x2);
        let user_addr = signer::address_of(&user);
        let store = signer::address_of(&admin);
        initialize(&admin);

        let q1:String = utf8(b"What is at the end of the rainbow?");

        let a1: String = utf8(b"w");

        insert_qna_hashes(store, q1, a1);
        
        let qna = borrow_global<Qna>(store);

        let user1_answer1 = utf8(b"wtf");
        let user1_ans1_hash = hashify(&user1_answer1);
        
        let is_user_answer_correct = is_answer_correct(qna, q1, user1_ans1_hash);

        assert!(is_user_answer_correct==false, 401);

        insert_answer(&user, store, q1, user1_answer1);

        let user1_points = get_user_points(user_addr, store);

        assert!(user1_points==0, 402);

        insert_answer(&user, store, q1, user1_answer1);

        let user1_points = get_user_points(user_addr, store);

        assert!(user1_points==0, 403);
        
    }


}