# Nora API Client

Shared API boundary for future sync/cloud features.

The current desktop product remains local-first. Keep this package thin and
transport-focused: request primitives, auth headers, error normalization, and
endpoint wrappers belong here. Product/business behavior stays in apps or
domain packages.

This package is not used by the current local-first desktop release pipeline.
Do not add network dependencies to production apps through this package without
documenting the privacy and rollout impact.
