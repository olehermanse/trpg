# TPG

https://tpg.oleherman.com

## Development server

Start the development server:

```
npm run dev-server
```

For development purposes it defaults to port 3000:

http://127.0.0.1:3000

## Containers

### docker

```
docker build --tag tpg . && docker run -it -p 80:80 --name tpg --rm tpg
```

http://127.0.0.1:80
