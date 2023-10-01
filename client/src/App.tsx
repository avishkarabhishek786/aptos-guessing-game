import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import { Provider, Network } from "aptos";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import { Layout, Row, Col, Button, Spin, List, Checkbox, Input } from "antd";
import { useEffect, useState } from "react";

function App() {

    const provider = new Provider(Network.DEVNET);

    const moduleAddress = "0x635bc91e8f3cd9759b5d90f80e94bb34fae17f9fa48345970667955d63084e3e";

    const { account, signAndSubmitTransaction } = useWallet();

    const [accountHasQuizList, setAccountHasQuizList] = useState<boolean>(false);

    const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);

    const [qnaList, setQnaList] = useState([]);

    const fetchList = async () => {
        if (!account) return [];

        try {
            const QuizListResource = await provider.getAccountResource(
                account.address,
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

            setQnaList(qna_list.data);

        } catch (e: any) {
            setAccountHasQuizList(false);
        }
    };

    const addNewQuizList = async () => {
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
            </Layout>
            <Spin spinning={transactionInProgress}>
                {!accountHasQuizList && (
                    <Row gutter={[0, 32]} style={{ marginTop: "2rem" }}>
                        <Col span={8} offset={8}>
                            <Button onClick={addNewQuizList} block type="primary" style={{ height: "40px", backgroundColor: "#3f67ff" }}>
                                Add new list
                            </Button>
                        </Col>
                    </Row>
                )}
            </Spin>
        </>
    );

}

export default App;