#!/bin/bash

vipsversion="8.11.4"
arch=$(dpkg --print-architecture)

if [ "$arch" != "amd64" ]; then
  apt-get install -y build-essential pkg-config glib2.0-dev libexpat1-dev libtiff5-dev libjpeg-turbo8-dev libgsf-1-dev
  wget "https://github.com/libvips/libvips/releases/download/v${vipsversion}/vips-${vipsversion}.tar.gz" -O vips.tar.gz
  tar xf vips.tar.gz
  cd "vips-${vipsversion}" || exit
  ./configure
  make
  make install
  ldconfig
  npm ci
fi
