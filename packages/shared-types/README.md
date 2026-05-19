# Nora Shared Types

Shared domain contracts for Nora apps and future APIs.

Keep this package business-oriented and framework-free: interfaces, enums,
schemas, DTOs, and serialized model shapes belong here. Runtime-specific models
can adapt these contracts inside each app.

Changing serialized contracts should include tests or fixtures in the consuming
app and a note in the relevant docs.
