# Contributing

## Keep the diagrams current

The diagrams in [`docs/diagrams/`](./docs/diagrams/) show the code as it is today. If your change alters a flow one of them draws, update that diagram in the same pull request. That covers a route, a queue, a job, a table, a state an Item can be in, or a step a worker takes.

Each diagram is an `.excalidraw.svg` with its scene embedded. Open it in [excalidraw.com](https://excalidraw.com) or the VS Code Excalidraw extension, edit it, and save it back as an SVG with "Embed scene" on, under the same name. The drawing conventions (current state only, colors by context, red for gaps and failures) are in the [Diagrams section of the docs README](./docs/README.md#diagrams).
