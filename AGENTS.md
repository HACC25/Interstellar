do not run tests
to install a python package, run "uv add <package-name>"

when working on the frontend:

- for frontend, work in v2.tsx
- do not touch routeTree.gen.ts
- look at frontend/src/routes/index.tsx for a guide on how to use the queries
- we will be working on multiple versions of views that all take in the same data.
- index.tsx is v0, kind of like a template.
- each version v1, v2, v3... should be in frontend/src/routes/
- ideally each version should be self contained and not reference any other versions.
