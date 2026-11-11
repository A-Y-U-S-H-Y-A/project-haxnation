FROM alpine:3.20
# a build image with the docker CLI but NOT privileged — the socket is the flaw
RUN apk add --no-cache docker-cli curl bash
CMD ["/bin/sh", "-c", "while :; do sleep 3600; done"]
