# Simple Projet Generator

## Description

This tool lets you setup and download a basic project theme to start working on it, or to use as is.

## Inputs

Because the tool has to remain simple, you won't be able to change a lot of things from the browser. It is recommended to keep polishing the theme on your local machine. Nevertheless, here are elements that you can import in the tool to create your template :

- Theme name ;
- Author Name ;
- Description ;
- Palettes(s) : These can be created from the palette-generator, then imported as .json files ;
- Background (optional) ;
- Main navigation icons (Optional);
- Font : If no font is imported, the tool will use the default font ;
- Toggle the use of a header or not. Header color is primary-color ;
- Toggle the use of a footer. Footer color is primary-color ;
- Choose between `carousel`, `grid`, or `list` for emulator selection ;
- Add a radius (0-100%) to buttons and list selectors.

## Generation

The tool can then generate a folder containing everything needed for [spruce-theme-builder](https://github.com/nco-design/spruce-theme-builder) to build your theme.
Project folder will have to be pasted in `spruce-theme-builder/projects/themes`.
