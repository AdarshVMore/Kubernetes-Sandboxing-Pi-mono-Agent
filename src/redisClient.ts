import { createClient, type RedisClientType } from "redis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://redis:6379";

let redisClient : RedisClientType | null = null

export async function getRedisConnection():Promise<RedisClientType> {
    if(!redisClient){
        redisClient = createClient({ url: REDIS_URL }) as RedisClientType

        redisClient.on("error", (err:Error)=>{
            console.error("Redis Error:", err);
        })

        await redisClient.connect()
        console.log("redis client connected successfully")
    }

    return redisClient
}
