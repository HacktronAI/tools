'use client'

import { useEffect, useMemo, useState } from 'react'

type SchemaProperty = { type?: string | string[]; enum?: unknown[]; description?: string }
type Schema = { required?: string[]; properties?: Record<string, SchemaProperty> }
type Tool = {
  name: string
  description: string
  capability: string
  confidence: string
  implemented?: boolean
  parameters?: Schema
}
type Provider = { id: string; name: string; agent: string; version: string; source: string; tools: Tool[] }
type RegistryData = { providers: Provider[] }

function Badge({ kind, children }: { kind: string; children: React.ReactNode }) {
  return <span className={`badge ${kind}`}>{children}</span>
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const inferred = /inferred/i.test(confidence)
  return <Badge kind={inferred ? 'inferred' : 'official'}>{inferred ? 'inferred' : 'official'}</Badge>
}

export default function Registry() {
  const [data, setData] = useState<RegistryData>()
  const [providerId, setProviderId] = useState('')
  const [selectedTool, setSelectedTool] = useState<string>()
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch('/api.json')
      .then((response) => response.json() as Promise<RegistryData>)
      .then((registry) => {
        setData(registry)
        setProviderId(registry.providers[0]?.id ?? '')
      })
  }, [])

  const provider = data?.providers.find((item) => item.id === providerId)
  const tools = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return (provider?.tools ?? []).filter(
      (tool) =>
        !normalized ||
        tool.name.toLowerCase().includes(normalized) ||
        tool.description.toLowerCase().includes(normalized) ||
        Object.keys(tool.parameters?.properties ?? {}).some((field) => field.toLowerCase().includes(normalized)),
    )
  }, [provider, query])
  const tool = provider?.tools.find((item) => item.name === selectedTool)

  function chooseProvider(id: string) {
    setProviderId(id)
    setSelectedTool(undefined)
  }

  if (!data) return <div className="loading">Loading registry...</div>

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">
          <div>
            <strong>agent-tools</strong>
            <span>registry</span>
          </div>
        </div>
        <p className="tagline">Tool schemas each model family was trained on</p>
        <div className="railLabel">Providers</div>
        <nav className="providers" aria-label="Providers">
          {data.providers.map((item) => (
            <button
              className={item.id === providerId ? 'provider active' : 'provider'}
              key={item.id}
              onClick={() => chooseProvider(item.id)}
            >
              <span className="providerTop"><strong>{item.name}</strong><span>{item.tools.length}</span></span>
              <small>{item.agent} / {item.version}</small>
            </button>
          ))}
        </nav>
        <div className="railMeta">{data.providers.reduce((n, p) => n + p.tools.length, 0)} schemas / {data.providers.length} providers</div>
      </aside>

      <main>
        <header className="topbar">
          <span className="indexLabel">Schema index</span>
          <label className="search">
            <input
              aria-label="Filter tools"
              placeholder="Search name, description, or field"
              type="search"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setSelectedTool(undefined) }}
            />
          </label>
          <a className="repoLink" href="https://github.com/HacktronAI/tools" target="_blank" rel="noreferrer">GitHub ↗</a>
        </header>

        {provider && (
          <section>
            <div className="sectionHead">
              <div>
                <p className="eyebrow">{provider.agent} / {provider.version}</p>
                <h1>{tool ? tool.name : provider.name}</h1>
              </div>
              {!tool && <div className="sectionActions"><span className="resultCount">{tools.length} {tools.length === 1 ? 'tool' : 'tools'}</span><a className="download" href={`/api/providers/${provider.id}/schema`} download>Download JSON</a></div>}
            </div>

            {tool ? (
              <ToolDetail tool={tool} provider={provider} onBack={() => setSelectedTool(undefined)} />
            ) : tools.length ? (
              <div className="toolList">
                {tools.map((item) => (
                  <button className="toolRow" key={item.name} onClick={() => setSelectedTool(item.name)}>
                    <span className="toolCopy">
                      <strong>{item.name}</strong>
                      <small>{item.description.split('\n')[0]}</small>
                    </span>
                    <span className="badges">
                      <Badge kind="cap">{item.capability}</Badge>
                    </span>
                  </button>
                ))}
              </div>
            ) : <div className="empty">No tools match "{query}".</div>}
          </section>
        )}

      </main>
    </div>
  )
}

function ToolDetail({ tool, provider, onBack }: { tool: Tool; provider: Provider; onBack: () => void }) {
  const schema = JSON.stringify(tool.parameters ?? {}, null, 2)
  return (
    <>
      <button className="back" onClick={onBack}>← Back to {provider.name}</button>
      <article className="detail">
        <div className="detailBadges">
          <Badge kind="cap">{tool.capability}</Badge>
          <ConfidenceBadge confidence={tool.confidence} />
          {tool.implemented && <Badge kind="implemented">ref impl</Badge>}
        </div>
        <p className="provenance">Source: {provider.source}</p>
        <h2>Description sent to the model</h2>
        <pre className="description">{tool.description}</pre>
        <div className="schemaHead">
          <h2>Input schema</h2>
          <CopyButton value={schema} />
        </div>
        <JsonBlock code={schema} />
      </article>
    </>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="copy"
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
    >
      {copied ? 'Copied' : 'Copy JSON'}
    </button>
  )
}

// Dependency-free JSON syntax highlighter: tokenize pretty-printed JSON and
// wrap each token in a span the stylesheet colors.
function JsonBlock({ code }: { code: string }) {
  const tokens: React.ReactNode[] = []
  const re = /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|(\b(?:true|false|null)\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\],])/g
  let last = 0
  let match: RegExpExecArray | null
  let i = 0
  while ((match = re.exec(code)) !== null) {
    if (match.index > last) tokens.push(code.slice(last, match.index))
    const [text, key, str, keyword, num, punct] = match
    const cls = key ? 'jsonKey' : str ? 'jsonStr' : keyword ? 'jsonKw' : num ? 'jsonNum' : punct ? 'jsonPunct' : undefined
    tokens.push(cls ? <span className={cls} key={i++}>{text}</span> : text)
    last = re.lastIndex
  }
  if (last < code.length) tokens.push(code.slice(last))
  return <pre className="jsonBlock"><code>{tokens}</code></pre>
}
