FROM debian:bookworm-slim AS diskbuilder
RUN apt-get update \
 && apt-get install -y --no-install-recommends e2fsprogs util-linux coreutils \
 && rm -rf /var/lib/apt/lists/*
RUN dd if=/dev/zero of=/hostdisk.img bs=1M count=16
RUN mkfs.ext4 -q -F /hostdisk.img
RUN mkdir -p /hostfs/opt/ctf \
 && printf 'HXN{privileged_jobs_see_host_devices}\n' > /hostfs/opt/ctf/flag.txt
# write the flag straight into the ext4 image without mounting it
RUN debugfs -w -R 'mkdir /opt' /hostdisk.img \
 && debugfs -w -R 'mkdir /opt/ctf' /hostdisk.img \
 && debugfs -w -R 'write /hostfs/opt/ctf/flag.txt /opt/ctf/flag.txt' /hostdisk.img

# The "CI job" sandbox. Privileged on purpose: this is the vulnerable tag.
FROM alpine:3.20
RUN apk add --no-cache bash util-linux e2fsprogs coreutils
COPY --from=diskbuilder /hostdisk.img /hostdisk.img
CMD ["/bin/bash", "-c", "sleep infinity"]
