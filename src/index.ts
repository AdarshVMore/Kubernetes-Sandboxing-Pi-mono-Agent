import express from "express";
import {getRedisConnection} from "./redisClient"
import type {chatRequest} from "./types/index"
import { manipulatePods } from "./k8s/startPods";

const app = express()

app.use(express.json())

manipulatePods("kubectl apply -f ./src/k8s/replicaSet.yml") // this will start all the 8Pods

app.post("/chat", async (req,res)=>{
    const redisClient = await getRedisConnection()
    let {prompt, sessionId} = req.body
    if(!sessionId) {
        sessionId =  `session-${Math.random()}`      
    }

    const sendBody:chatRequest = {prompt, sessionId}

    const promptSent = await redisClient.lPush("chat-session-req", JSON.stringify(sendBody))

    console.log("sent response to queue", promptSent)

    const responseRecieved = await redisClient.brPop("chat-session-res", 0)

    console.log("response recieved: ", responseRecieved)

    res.status(200).json({message: responseRecieved})
})

app.get("/pod", (req, res) => {
 // probably node js has some library to talk to k8s locally
})

app.get("/health", (req, res) => {
    
})

app.listen(3000, ()=>{console.log("running server on port 3000")})