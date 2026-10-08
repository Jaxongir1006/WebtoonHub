import fs from 'node:fs'

export const contracts = JSON.parse(fs.readFileSync(new URL('./fixtures/staff-contracts.json', import.meta.url), 'utf8'))

// Only request-schema assertions used by these fixtures; no server implementation
// is mirrored. The Python --check command verifies these schemas against Pydantic.
export function validateContract(name, payload) {
  const root = contracts[name]
  if (!root) throw new Error(`Unknown contract ${name}`)
  function valid(schema, value) {
    if (schema.$ref) return valid(root.$defs[schema.$ref.split('/').at(-1)], value)
    if (schema.anyOf) return schema.anyOf.some(choice => valid(choice, value))
    if (schema.type === 'null') return value === null
    if (schema.type === 'integer' && !Number.isInteger(value)) return false
    if (schema.type === 'number' && (!Number.isFinite(value) || typeof value !== 'number')) return false
    if (schema.type === 'string' && typeof value !== 'string') return false
    if (schema.type === 'boolean' && typeof value !== 'boolean') return false
    if (schema.type === 'array' && (!Array.isArray(value) || !value.every(item => valid(schema.items || {}, item)))) return false
    if (schema.type === 'object') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return false
      if ((schema.required || []).some(key => !Object.hasOwn(value, key))) return false
      if (Object.entries(value).some(([key, item]) => schema.properties?.[key] ? !valid(schema.properties[key], item) : schema.additionalProperties === false)) return false
    }
    if (schema.enum && !schema.enum.includes(value)) return false
    if (schema.minimum !== undefined && value < schema.minimum) return false
    if (schema.maximum !== undefined && value > schema.maximum) return false
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) return false
    if (schema.minLength !== undefined && value.length < schema.minLength) return false
    if (schema.maxLength !== undefined && value.length > schema.maxLength) return false
    if (schema.maxItems !== undefined && value.length > schema.maxItems) return false
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) return false
    return true
  }
  if (!valid(root, payload)) throw new Error(`Request violates ${name}: ${JSON.stringify(payload)}`)
  return true
}
