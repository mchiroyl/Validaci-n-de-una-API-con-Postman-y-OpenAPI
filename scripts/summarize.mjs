// Newman records pm.sendRequest callbacks as additional executions of the same item.
// Count only beforeItem visits as primary situations; aggregate their unique tests.
export function summarizeExecutions(raw, primaryStatuses = new Map()) {
  const groups = new Map();
  for (const execution of raw) {
    const name = execution.item.name;
    if (!groups.has(name)) groups.set(name, { name, status: primaryStatuses.get(name) ?? execution.response?.code ?? 0, assertions: new Map() });
    const group = groups.get(name);
    for (const a of execution.assertions || []) {
      const existing = group.assertions.get(a.assertion);
      if (!existing || a.error) group.assertions.set(a.assertion, { name: a.assertion, passed: !a.error, ...(a.error ? { message: a.error.message } : {}) });
    }
  }
  return [...groups.values()].map(x => ({ ...x, assertions: [...x.assertions.values()] }));
}
