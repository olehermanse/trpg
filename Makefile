.PHONY: docker podman check

check:
	deno task test

docker:
	docker build --tag trpg . && docker run -it -p 3000:3000 --name trpg --rm trpg

podman:
	podman build --tag trpg . && podman run -it -p 3000:3000 --name trpg --rm trpg
