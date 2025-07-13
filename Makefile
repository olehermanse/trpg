.PHONY: podman docker check

check:
	deno task test

podman:
	podman build --tag trpg . && podman run -it -p 3000:3000 --name trpg --rm trpg

docker:
	docker build --tag trpg . && docker run -it -p 3000:3000 --name trpg --rm trpg
