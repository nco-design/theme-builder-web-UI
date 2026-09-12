# Browser Theme Builder scope

The browser builder is intentionally a simple alternative to
`spruce-theme-builder`. It creates a theme from an imported project ZIP without
requiring Node.js, npm or a local installation of the full builder.

## Supported files

The selected front-end provides placeholder static files. A file with the same
relative path in the project's `assets/` directory replaces that placeholder.
For example, `assets/config.json` in the imported project replaces the
front-end's default `config.json`. Project files are therefore the explicit way
to customize a front-end default.

## Not supported

The browser builder never runs front-end build options. For example, it does
not reproduce the Node builder's `--720p` option: it builds only the base
profile and does not generate the optional assets or configuration.

It also does not generate an icon pack. The full Node builder remains the
recommended tool when those features are needed.

This tool is just a slimmed down, simple exporter for beginners.
