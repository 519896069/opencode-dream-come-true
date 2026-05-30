export type ObsidianAction = "open" | "new" | "daily" | "search" | "graph" | "settings" | "advanced"

export interface ObsidianParams {
  action: ObsidianAction
  vault?: string
  file?: string
  name?: string
  folder?: string
  content?: string
  query?: string
  commandid?: string
  heading?: string
  blockId?: string
}

function encode(s: string): string {
  return encodeURIComponent(s)
}

export function buildUri(params: ObsidianParams): string {
  const { action, vault, file, name, folder, content, query, commandid, heading, blockId } = params

  if (action === "settings") {
    return "obsidian://settings"
  }

  const vaultStr = vault ? encode(vault) : ""

  switch (action) {
    case "open": {
      let path = ""
      if (file) {
        path = `&file=${encode(file)}`
        if (heading) path += `#${encode(heading)}`
        if (blockId) path += `#^${encode(blockId)}`
      }
      return `obsidian://open?vault=${vaultStr}${path}`
    }

    case "new": {
      const parts: string[] = [`vault=${vaultStr}`]
      if (name) parts.push(`name=${encode(name)}`)
      if (folder) parts.push(`file=${encode(folder)}`)
      if (content) parts.push(`content=${encode(content)}`)
      return `obsidian://new?${parts.join("&")}`
    }

    case "daily":
      return `obsidian://daily?vault=${vaultStr}`

    case "search": {
      const q = query ? `&query=${encode(query)}` : ""
      return `obsidian://search?vault=${vaultStr}${q}`
    }

    case "graph":
      return `obsidian://graph?vault=${vaultStr}`

    case "advanced": {
      const cmd = commandid ? `&commandid=${encode(commandid)}` : ""
      return `obsidian://advanced-uri?vault=${vaultStr}${cmd}`
    }

    default:
      return `obsidian://open?vault=${vaultStr}`
  }
}

export function buildCommand(uri: string): string {
  return `start "obsidian" "${uri}"`
}

export function buildObsidianResult(params: ObsidianParams): string {
  const uri = buildUri(params)
  const command = buildCommand(uri)
  return JSON.stringify({ uri, command })
}
