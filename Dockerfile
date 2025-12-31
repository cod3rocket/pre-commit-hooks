FROM docker.io/library/almalinux:10 AS base

ARG BUILD_DATE
ARG BUILD_VERSION

LABEL maintainer="contato@cod3rocket.com"
LABEL org.opencontainers.image.created=$BUILD_DATE
LABEL org.opencontainers.image.authors="Cod3Rocket"
LABEL org.opencontainers.image.url="https://github.com/cod3rocket/pre-commit-hooks"
LABEL org.opencontainers.image.documentation="https://github.com/cod3rocket/pre-commit-hooks"
LABEL org.opencontainers.image.source="https://github.com/cod3rocket/pre-commit-hooks"
LABEL org.opencontainers.image.version=$BUILD_VERSION
LABEL org.opencontainers.image.vendor="Cod3Rocket"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.title="pre-commit-hooks"
LABEL org.opencontainers.image.description="Hooks de pre commit da cod3Rocket"
LABEL org.opencontainers.image.base.name="docker.io/library/almalinux:10"

ENV USER=cod3rocket
ENV HOME=/home/$USER
ENV PATH="$PATH:$HOME/.local/bin:$HOME/.local/share/mise/shims"

RUN dnf install -y curl ca-certificates tar freetype dejavu-sans-fonts fontconfig \
    && dnf clean all \
    && rm -rf /var/cache/yum \
    && useradd -m -s /bin/bash $USER

USER $USER
WORKDIR $HOME

RUN curl https://mise.run | sh \
    && mise settings set experimental true \
    && echo "eval \"\$(~/.local/bin/mise activate bash)\"" >> ~/.bashrc \
    && eval "$(~/.local/bin/mise activate bash)"

COPY mise.toml /etc/mise/config.toml

RUN mise trust && mise install --yes && mise reshim

COPY --chown=$USER:$USER package.json bun.lock main.ts /opt/cod3rocket/pre-commit-hooks/

WORKDIR /opt/cod3rocket/pre-commit-hooks

RUN bun i

ENTRYPOINT [ "bun", "run", "entrypoint.ts" ]
