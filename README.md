# Create a JavaScript Action

![coverage](https://raw.githubusercontent.com/cjlapao/setup-flutter/main/badges/coverage.svg)
[![Lint Codebase](https://github.com/cjlapao/setup-flutter/actions/workflows/linter.yml/badge.svg)](https://github.com/cjlapao/setup-flutter/actions/workflows/linter.yml)
[![CI](https://github.com/cjlapao/setup-flutter/actions/workflows/ci.yml/badge.svg)](https://github.com/cjlapao/setup-flutter/actions/workflows/ci.yml)

This action sets up a flutter environment for use in actions on any environment,
it works on windows, linux and macOS. In Linux it does take into consideration
that the arm64 architecture is not yet supported by flutter, this will install
the current amd64 and allow flutter internals to do the rest.

## Usage

you can define what channel you want to use:

```yaml
steps:
  - uses: actions/checkout@v2
  - uses: cjlapao/setup-flutter@v1
    with:
      channel: 'stable'
```

or you can define the version you want to use:

```yaml
steps:
  - uses: actions/checkout@v2
  - uses: cjlapao/setup-flutter@v1
    with:
      flutter-version: '3.3.6'
```

## Options

| Name              | Description                                          | Default             |
| ----------------- | ---------------------------------------------------- | ------------------- |
| `channel`         | The channel to use for flutter installation          | `stable`            |
| `architecture`    | The architecture to use for flutter installation     | runner architecture |
| `flutter-version` | The version to use for flutter installation          | `latest`            |
| `query-only`      | Whether to only query the flutter installation       | `false`             |
| `cache`           | Whether to cache the flutter installation            | `true`              |
| `cache-key`       | The key to use for caching the flutter installation  | `flutter`           |
| `cache-path`      | The path to use for caching the flutter installation | `~/.cache/flutter`  |

## Outputs

| Name           | Description                                    |
| -------------- | ---------------------------------------------- |
| `version`      | The version of flutter that was installed      |
| `cache-path`   | The path to the flutter installation           |
| `cache-key`    | The key to the flutter installation            |
| `channel`      | The channel of flutter that was installed      |
| `architecture` | The architecture of flutter that was installed |
