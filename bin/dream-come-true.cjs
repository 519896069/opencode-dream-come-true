#!/usr/bin/env node
const { existsSync } = require("fs")
const { join, resolve } = require("path")
const { setup } = require("./setup.cjs")

const pkgRoot = resolve(__dirname, "..")
const agentsDir = join(pkgRoot, ".agents")

if (process.argv[2] !== "setup") {
  const v = (() => { try { return require(join(pkgRoot, "package.json")).version } catch { return "?.?.?" } })()
  console.log([
    "dream-come-true v" + v,
    "",
    "  dream-come-true setup    Register plugin + agents to opencode.json",
  ].join("\n"))
  process.exit(0)
}

if (!existsSync(agentsDir)) {
  console.error("error: .agents/ not found")
  process.exit(1)
}

const count = setup(agentsDir)
if (count > 0) {
  console.log("dream-come-true: registered " + count + " agents + plugin")
} else {
  console.log("dream-come-true: already configured")
}
