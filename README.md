# trpg

Website:

https://trpg.oleherman.com

Run locally with docker:

```
docker build --tag trpg . && docker run -it -p 3000:3000 --name trpg --rm trpg
```

Or podman:

```
podman build --tag trpg . && podman run -it -p 3000:3000 --name trpg --rm trpg
```

http://127.0.0.1:3000

## License

Copyright (C) 2025 Ole Herman Schumacher Elgesem

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
