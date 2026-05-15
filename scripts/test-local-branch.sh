#!/bin/bash

# Run this from the repo where you want to test the local branch of SpotMe

set -euo pipefail

spotme_dir=$(dirname $(dirname "$0"))
mkdir -p $(pwd)/.opencode/plugins
ln -s $spotme_dir $(pwd)/.opencode/plugins/spotme

cat > .opencode/plugins/spotme.ts <<EOF
export { SpotMePlugin } from './spotme/src';
EOF
