const { join, resolve } = require("path")
const { setup } = require("./bin/setup.cjs")

const pkgRoot = resolve(__dirname)
const agentsDir = join(pkgRoot, ".agents")

const count = setup(agentsDir)
if (count > 0) {
  console.log("dream-come-true: " + count + " agents + plugin registered")
}
