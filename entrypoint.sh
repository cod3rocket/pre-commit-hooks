#!/usr/bin/env bash

paths=("$@")
novo_paths=()

for path in "${paths[@]}"; do
  novo_paths+=("/src/$path")
done

echo "Executa os hooks"
cd /opt/cod3rocket/pre-commit-hooks/
bun run main.ts "${novo_paths[@]}"
