import express from "express";
import {getRedisConnection} from "./redisClient"
import type {chatRequest} from "./types/index"
import { manipulatePods } from "./k8s/startPods";

const app = express()

app.use(express.json())

manipulatePods("kubectl apply -f ./src/k8s/replicaset.yml")

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
})

app.get("/pod", (req, res) => {

})

app.get("/health", (req, res) => {
    
})