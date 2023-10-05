import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import { Provider, Network } from "aptos";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import { Layout, Row, Col, Button, Spin, List, Input } from "antd";
import { useEffect, useState } from "react";

function App() {

    const provider = new Provider(Network.DEVNET);

    const moduleAddress = "0x4b0381266aca54cc882efdd14621a9e70dd4d34ebb21977ffd336472e90fd6ba";

    const { account, signAndSubmitTransaction } = useWallet();

    const [accountHasQuizList, setAccountHasQuizList] = useState<boolean>(false);

    const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);

    const [qnaList, setQnaList] = useState<Qlist[]>([]);
    const [unansweredList, setUnansweredList] = useState<Qlist[]>([]);
    const [answeredList, setAnsweredList] = useState<Qlist[]>([]);

    const [newQuizQuestion, setNewQuizQuestion] = useState<string>("");
    const [newQuizAnswer, setNewQuizAnswer] = useState<string>("");
    const [writeAnsweringQuiz, setWriteAnsweringQuiz] = useState<string>("");

    const [userPoint, setUserPoint] = useState<any>();

    type Qlist = {
        key: String,
        value: String
    }

    const fetchList = async () => {
        if (!account) return [];
        
        try {
            const QuizListResource = await provider.getAccountResource(
                moduleAddress,
                `${moduleAddress}::GuessingGame::Qna`
            );
            
            setAccountHasQuizList(true);

            const qna_list = (QuizListResource as any).data.qna_list;
            const all_user_points = (QuizListResource as any).data.points;
            const user_correct_responses = (QuizListResource as any).data.user_correct_responses;

            let user_points = all_user_points.data.filter((f: { key: string })=>f.key===account.address);
            
            if(user_points.length) {
                setUserPoint(user_points[0].value);
            } else {
                setUserPoint(0);
            }

            const all_quizes = qna_list.data.map((m: { key: any; }) => m.key);

            const answered_quizes = user_correct_responses.data
                .filter((f: { key: string; })=>f.key===account.address)
                .map((m: { value: any; })=>m.value);

            const unanswered_quizes = all_quizes.filter((f: any, i: string | number) => {
                if(!!answered_quizes[0]) {
                    return !answered_quizes[0].includes(f)
                } else {
                    return f;
                }
            });
            // console.log(all_quizes);
            // console.log(answered_quizes);
            // console.log(unanswered_quizes);

            setQnaList(qna_list.data);

            setUnansweredList(unanswered_quizes);

            setAnsweredList(answered_quizes[0]);

        } catch (e: any) {
            setAccountHasQuizList(false);
        }
    };

    const initialize = async () => {
        if (!account) return [];
        setTransactionInProgress(true);
        // build a transaction payload to be submited
        const payload = {
            type: "entry_function_payload",
            function: `${moduleAddress}::GuessingGame::initialize`,
            type_arguments: [],
            arguments: [],
        };
        try {
            // sign and submit transaction to chain
            const response = await signAndSubmitTransaction(payload);
            // wait for transaction
            await provider.waitForTransaction(response.hash);
            setAccountHasQuizList(true);
        } catch (error: any) {
            setAccountHasQuizList(false);
        } finally {
            setTransactionInProgress(false);
        }
    };

    const onWriteNewQuizQuestion = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value.toLowerCase();
        setNewQuizQuestion(value);
    };

    const onWriteNewQuizAnswer = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value.toLowerCase();
        setNewQuizAnswer(value);
    }

    const onWriteAnsweringQuiz = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value.toLowerCase();
        setWriteAnsweringQuiz(value);
    }

    const onQuizAdded = async () => {
        // check for connected account
        if (!account) return;

        if(onlyOneWrod(newQuizAnswer) == false) {
            alert("Answer must be one word only");
            return;
        }

        setTransactionInProgress(true);
        // build a transaction payload to be submited
        const payload = {
            type: "entry_function_payload",
            function: `${moduleAddress}::GuessingGame::insert_qna_hashes`,
            type_arguments: [],
            arguments: [moduleAddress, newQuizQuestion, newQuizAnswer],
        };

        // hold the latest task.task_id from our local state
        //const latestId = qnaList.length;

        // build a newTaskToPush object into our local state
        // const newTaskToPush = {
        //     key: newQuizQuestion,
        //     value: newQuizAnswer
        // };

        try {
            // sign and submit transaction to chain
            const response = await signAndSubmitTransaction(payload);
            // wait for transaction
            await provider.waitForTransaction(response.hash);

            // Create a new array based on current state:
            //let newList = [...qnaList];

            // Add item to the newList array
            //newList.push(newTaskToPush);
            // Set state
            setQnaList(qnaList);
            fetchList();
            // clear input text
            setNewQuizQuestion("");
            setNewQuizAnswer("");
        } catch (error: any) {
            console.log("error", error);
        } finally {
            setTransactionInProgress(false);
        }
    };

    const onQuizAnswerSubmit = async (q: String) => {
        // check for connected account
        if (!account) return;
        setTransactionInProgress(true);
        
        // build a transaction payload to be submited
        const payload = {
            type: "entry_function_payload",
            function: `${moduleAddress}::GuessingGame::insert_answer`,
            type_arguments: [],
            arguments: [moduleAddress, q, writeAnsweringQuiz],
        };

        try {
            // sign and submit transaction to chain
            const response = await signAndSubmitTransaction(payload);
            // wait for transaction
            await provider.waitForTransaction(response.hash);

            setWriteAnsweringQuiz("");
        } catch (error: any) {
            console.log("error", error);
        } finally {
            setTransactionInProgress(false);
            fetchList();
        }
    };

    const capitlizeText = (word:String) => {
        if(typeof word == 'string') {
            return word.charAt(0).toUpperCase() + word.slice(1);
        } else {
            return word;
        }
    }

    function onlyOneWrod(input: string): string | boolean {
        // Check if the input contains only one word (no spaces)
        if (/^\S+$/.test(input)) {
            // Convert the input to lowercase and return
            return input.toLowerCase();
        } else {
            // If the input contains more than one word, return an error message
            return false;
        }
    }

    useEffect(() => {
        fetchList();
    }, [account?.address]);

    const data = [
        'Connect your wallet',
        'Correct answer adds 10 points',
        'Wrong answer subtracts 2 points',
        'All answers are one word',
        'You can also add a new riddle',
      ];

    return (
        <>
            <Layout>
                <Row align="middle">
                    <Col span={10} offset={2}>
                        <h1>The Guessing Game</h1>
                    </Col>
                    <Col span={12} style={{ textAlign: "right", paddingRight: "200px" }}>
                        <WalletSelector />
                    </Col>

                </Row>
                <Row align="middle">
                    <Col span={12} style={{ textAlign: "right" }}>
                        {account?.address ? (
                            <h3>Points: {userPoint}</h3>
                        ):(
                            <span></span>
                        )}
                        
                    </Col>
                </Row>
            </Layout>
            <Spin spinning={transactionInProgress}>
                {
                    !accountHasQuizList ? (
                        <Row align="middle" gutter={[0, 32]} style={{ marginTop: "2rem" }}>
                            {
                                account?.address == moduleAddress ? (
                                <Col span={8} offset={8}>
                                <Button
                                    disabled={!account}
                                    block
                                    onClick={initialize}
                                    type="primary"
                                    style={{ height: "40px", backgroundColor: "#3f67ff" }}
                                >
                                    Add new quiz list
                                </Button>
                            </Col>
                                ) : (

                                    <Col span={8} offset={8}>

                                  <List    
                                    itemLayout="horizontal"                             
                                    size="small"
                                    header={<h4>Game Rules</h4>}
                                    bordered
                                    dataSource={data}
                                    renderItem={(item) => <List.Item>{item}</List.Item>}
                                  />

                                  </Col>

                                )
                            }
                            
                        </Row>
                    ) : (
                        <Row gutter={[0, 32]} style={{ marginTop: "2rem" }}>
                            <Col span={8} offset={8}>
                                <Input.Group compact>
                                    <Input
                                        onChange={(event) => onWriteNewQuizQuestion(event)}
                                        style={{ width: "calc(100% - 60px)" }}
                                        placeholder="Add New Quiz Question"
                                        size="large"
                                        value={newQuizQuestion}
                                    />
                                    <Input
                                        onChange={(event) => onWriteNewQuizAnswer(event)}
                                        style={{ width: "calc(100% - 60px)" }}
                                        placeholder="Add Correct Answer"
                                        size="large"
                                        value={newQuizAnswer}
                                    />
                                    <Button
                                        onClick={onQuizAdded}
                                        type="primary"
                                        style={{ height: "40px", backgroundColor: "#3f67ff" }}
                                    >
                                        Add
                                    </Button>
                                </Input.Group>
                            </Col>
                            <Col span={8} offset={8}>
                                {unansweredList && (
                                    <List
                                        itemLayout="horizontal"
                                        size="small"
                                        bordered
                                        dataSource={unansweredList}
                                        renderItem={(ual: any) => (
                                            <List.Item
                                                actions={[
                                                    <div>
                                                        {(
                                                            <>
                                                                <List.Item.Meta
                                                                    title={capitlizeText(ual)}
                                                                    description="Answer should be one word and small cap."
                                                                />
                                                                <Input
                                                                    onChange={(event) => onWriteAnsweringQuiz(event)}
                                                                    style={{ width: "calc(100% - 60px)" }}
                                                                    placeholder="Guess The Quiz Answer"
                                                                    size="large"
                                                                    name="input_answer_quiz"
                                                                />
                                                                <Button
                                                                    onClick={() => onQuizAnswerSubmit(ual)}
                                                                    type="primary"
                                                                    style={{ height: "40px", backgroundColor: "#3f67ff", marginTop: "10px" }}
                                                                >
                                                                    Answer
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>,
                                                ]}
                                            >
                                            </List.Item>
                                        )}
                                    />
                                )}
                            </Col>
                            <Col span={8} offset={8}>
                                {answeredList && (
                                    <List
                                        size="small"
                                        bordered
                                        dataSource={answeredList}
                                        renderItem={(al: any) => (
                                            <List.Item>
                                                <List.Item.Meta
                                                    title={capitlizeText(al)}
                                                    description="You guess it. 10 points added."
                                                />
                                            </List.Item>
                                        )}
                                    />
                                )}
                            </Col>
                        </Row>
                    )}
            </Spin>
        </>
    );

}

export default App;