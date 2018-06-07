#!/usr/bin/env bash

TARGET_PATH=$(realpath $1)

./scripts/pre_deploy.sh

rm -rf "$TARGET_PATH/.dspm"
rm -rf "$TARGET_PATH/dspm"

echo "installing dspm..."

mkdir -p "$TARGET_PATH/.dspm/dist"
tar -xzf ./build/dspm.tar.gz -C "$TARGET_PATH/.dspm/dist"

cp ./build/dspm "$TARGET_PATH/dspm"
chmod +x "$TARGET_PATH/dspm"
