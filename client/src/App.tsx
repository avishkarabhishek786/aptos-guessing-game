import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import { Provider, Network } from "aptos";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import { Layout, Row, Col, Button, Spin, List, Checkbox, Input } from "antd";
import { useEffect, useState } from "react";

function App() {

    const provider = new Provider(Network.DEVNET);

    const moduleAddress = "0x7a59f367aca1633827bf7a57d9fe787a6fe7b6c340492ed8aad19ea565c3d23a";

    const { account, signAndSubmitTransaction } = useWallet();

    const [accountHasQuizList, setAccountHasQuizList] = useState<boolean>(false);

    const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);

    const [qnaList, setQnaList] = useState<Qlist[]>([]);

    const [newQuizQuestion, setNewQuizQuestion] = useState<string>("");
    const [newQuizAnswer, setNewQuizAnswer] = useState<string>("");
    const [writeAnsweringQuiz, setWriteAnsweringQuiz] = useState<string>("");

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
            const user_points = (QuizListResource as any).data.points;
            const user_correct_responses = (QuizListResource as any).data.user_correct_responses;

            console.log(qna_list.data.length);

            for (let index = 0; index < qna_list.data.length; index++) {
                const qnaElem = qna_list.data[index];
                console.log(qnaElem);
            }

            console.log(...user_correct_responses.data);

            setQnaList(qna_list.data);

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
        const value = event.target.value;
        setNewQuizQuestion(value);
    };

    const onWriteNewQuizAnswer = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setNewQuizAnswer(value);
    }    
    
    const onWriteAnsweringQuiz = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setWriteAnsweringQuiz(value);
    }

    const onQuizAdded = async () => {
        // check for connected account
        if (!account) return;
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
        const newTaskToPush = {
            key: newQuizQuestion,
            value: newQuizAnswer
        };

        try {
            // sign and submit transaction to chain
            const response = await signAndSubmitTransaction(payload);
            // wait for transaction
            await provider.waitForTransaction(response.hash);

            // Create a new array based on current state:
            let newList = [...qnaList];

            // Add item to the newList array
            newList.push(newTaskToPush);
            // Set state
            setQnaList(qnaList);
            // clear input text
            setNewQuizQuestion("");
            setNewQuizAnswer("");
        } catch (error: any) {
            console.log("error", error);
        } finally {
            setTransactionInProgress(false);
        }
    };

    const onQuizAnswerSubmit = async (q:String) => {
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
        }
    };

    useEffect(() => {
        fetchList();
    }, [account?.address]);

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
                    <Col span={12} style={{ textAlign: "right"}}>
                         <h3>Points: 20</h3>
                    </Col>
                </Row>
            </Layout>
            <Spin spinning={transactionInProgress}>
                {
                    !accountHasQuizList ? (
                        <Row gutter={[0, 32]} style={{ marginTop: "2rem" }}>
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
                                        placeholder="Add New Quiz Answer"
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
                                {qnaList && (
                                    <List
                                        size="small"
                                        bordered
                                        dataSource={qnaList}
                                        renderItem={(ql: any) => (
                                            <List.Item
                                                actions={[
                                                    <div>
                                                        {false ? (
                                                            <Checkbox defaultChecked={true} disabled />
                                                        ) : (
                                                            <>
                                                        <Input
                                                            onChange={(event) => onWriteAnsweringQuiz(event)}
                                                            style={{ width: "calc(100% - 60px)" }}
                                                            placeholder="Guess The Quiz Answer"
                                                            size="large"
                                                            value={writeAnsweringQuiz}
                                                        />
                                                        <Button
                                                            onClick={()=>onQuizAnswerSubmit(ql.key)}
                                                            type="primary"
                                                            style={{ height: "40px", backgroundColor: "#3f67ff" }}
                                                        >
                                                            Answer
                                                        </Button>
                                                        </>
                                                        )}
                                                    </div>,
                                                ]}
                                            >
                                                <List.Item.Meta
                                                    title={ql.key}
                                                    description=""
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