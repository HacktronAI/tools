import registry from '../../../../../public/api.json'

export function GET(_request: Request, { params }: { params: Promise<{ provider: string }> }) {
  return params.then(({ provider }) => {
    const schema = registry.providers.find((item) => item.id === provider)

    if (!schema) return Response.json({ error: 'Provider not found' }, { status: 404 })

    return new Response(JSON.stringify(schema, null, 2), {
      headers: {
        'Content-Disposition': `attachment; filename="${provider}-tools-schema.json"`,
        'Content-Type': 'application/json; charset=utf-8',
      },
    })
  })
}
