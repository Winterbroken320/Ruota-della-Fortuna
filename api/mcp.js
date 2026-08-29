const fs = require("fs");
const path = require("path");

const TAGS_PATH = path.join(process.cwd(), "src", "tags.json");

function loadDimensions() {
  return JSON.parse(fs.readFileSync(TAGS_PATH, "utf-8"));
}

const TOOLS = [
  {
    name: "ero_slot_spin",
    description:
      "Spin the Ruota della Fortuna slot machine. Returns a random NSFW tag per active dimension — tonight's recipe. Defaults to all 6 non-gore dimensions if none specified.",
    inputSchema: {
      type: "object",
      properties: {
        active: {
          type: "array",
          items: {
            type: "string",
            enum: ["position", "scenario", "props", "roleplay", "physical", "mental"],
          },
          description: "Which dimensions to include (1-6). Omit for all 6.",
        },
        gore: {
          type: "boolean",
          description: "Unlock the 7th extreme dimension. Default false.",
          default: false,
        },
      },
    },
  },
  {
    name: "ero_slot_dimensions",
    description: "List all 7 dimensions and their tag counts.",
    inputSchema: { type: "object", properties: {} },
  },
];

function handleCall(name, args = {}) {
  const dims = loadDimensions();

  if (name === "ero_slot_dimensions") {
    return dims.map((d) => ({
      id: d.id,
      label: d.full || d.short,
      tagCount: d.tags.length,
      gore: !!d.gore,
    }));
  }

  if (name === "ero_slot_spin") {
    allNonGore = dims.filter((d) => !d.gore).map((d) => d.id);
    const active = args.active && args.active.length ? args.active : allNonGore;
    const gore = !!args.gore;
    const results = [];

    for (const dim of dims) {
      if (dim.gore && !gore) continue;
      if (!dim.gore && !active.includes(dim.id)) continue;
      if (!dim.tags.length) continue;
      const tag = dim.tags[Math.floor(Math.random() * dim.tags.length)];
      results.push({
        dimension: dim.id,
        label: dim.short || dim.en,
        zh: tag.zh,
        en: tag.en || "",
        ja: tag.ja || "",
      });
    }
    return results;
  }

  throw new Error("Unknown tool: " + name);
}

module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id, method, params } = req.body;

  if (method === "initialize") {
    return res.json({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "ero-slot", version: "1.0.0" },
      },
    });
  }

  if (method === "tools/list") {
    return res.json({
      jsonrpc: "2.0",
      id,
      result: { tools: TOOLS },
    });
  }

  if (method === "tools/call") {
    const { name, arguments: args } = params;
    try {
      const result = handleCall(name, args);
      return res.json({
