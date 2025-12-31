FROM docker.io/library/almalinux:10 AS base

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

COPY --chown=$USER:$USER package.json bun.lock entrypoint.ts /opt/cod3rocket/pre-commit-hooks/

WORKDIR /opt/cod3rocket/pre-commit-hooks

RUN bun i

ENTRYPOINT [ "bun", "run", "entrypoint.ts" ]
