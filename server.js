const path = require("path")
const fastify = require("fastify")({ logger: true })
const fastifyCors = require("@fastify/cors")

const fastifyFormbody = require("@fastify/formbody")

const PORT = process.env.PORT || 3000

// === 資料儲存區 ===
const fibonacci = [1, 2, 3, 5, 8, 13, 21, 34, 55]

// voteData: { topic: { num: [username] }
const voteData = {}

// votedUsers: { topic: Map(username → option) }
const votedUsers = {}

// === Plugin 註冊 ===

let assignedAliases = new Set()
const cuteNames = [
	"熊貓",
	"草莓",
	"檸檬",
	"狐狸",
	"兔兔",
	"綠茶",
	"喵喵",
	"咖啡",
	"貓熊",
	"櫻桃",
	"哈密瓜",
	"冰淇淋",
	"小太陽",
	"雲朵",
	"蜂蜜",
	"椰子",
	"藍莓",
	"貓掌",
	"香蕉",
	"抹茶",
]

fastify.register(require("@fastify/cors"), {
	origin: "https://fibonacci-easy-vote-rrbt.vercel.app",
	credentials: true,
})

fastify.register(fastifyFormbody)

fastify.get("/", async (req, reply) => {
	return "OK"
})

fastify.get("/api/register", async (req, reply) => {
	let alias
	for (const name of cuteNames) {
		if (!assignedAliases.has(name)) {
			alias = name
			break
		}
	}
	if (!alias) {
		alias = `匿名${assignedAliases.size - cuteNames.length + 1}`
	}
	assignedAliases.add(alias)
	return { alias }
})

// === GET /api/topics - 取得所有主題 ===
fastify.get("/api/topics", async (req, reply) => {
	return Object.keys(voteData)
})

// === POST /api/create-topic - 建立新主題 ===
fastify.post("/api/create-topic", async (req, reply) => {
	const topic = (req.body.topic || "").trim()
	if (!topic) {
		return reply.code(400).send({ success: false, message: "主題不得為空" })
	}

	if (voteData[topic]) {
		return { success: false, message: "主題已存在" }
	}

	voteData[topic] = {}
	votedUsers[topic] = new Map()

	fibonacci.forEach((n) => {
		voteData[topic][n] = []
	})

	return { success: true }
})

// === POST /api/vote - 投票（可修改）===
fastify.post("/api/vote", async (req, reply) => {
	const { alias, topic, option } = req.body

	if (!alias || !topic || option == null) {
		return reply.code(400).send("缺少欄位")
	}

	if (!voteData[topic] || !(option in voteData[topic])) {
		return reply.code(400).send("主題或選項不存在")
	}

	const prevOption = votedUsers[topic].get(alias)

	if (prevOption != null && prevOption === option) {
		return reply.send("你已投同一選項")
	}

	// 如果有舊票 → 移除
	if (prevOption != null) {
		voteData[topic][prevOption] = voteData[topic][prevOption].filter(
			(name) => name !== alias
		)
	}

	// 新票加入
	voteData[topic][option].push(alias)
	votedUsers[topic].set(alias, option)

	return reply.send("投票成功（已更新）")
})

// === GET /api/votes - 回傳所有統計資料與姓名清單 ===
fastify.get("/api/votes", async (req, reply) => {
	return voteData
})

// === 啟動伺服器 ===
const start = async () => {
	try {
		await fastify.listen({ port: PORT, host: "0.0.0.0" })
		console.log(`🚀 Fastify server running on http://localhost:${PORT}`)
	} catch (err) {
		fastify.log.error(err)
		process.exit(1)
	}
}
start()
