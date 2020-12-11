
COMMIT_DATE=$(git log --pretty="%cd" --date=short "HEAD...HEAD~1")
COMMIT_SHA=$(git log --pretty="%h" "HEAD...HEAD~1")

sed "s/COMMIT_DATE/$COMMIT_DATE/g" frontend/dist/index.html > tmp.html
sed "s/COMMIT_SHA/$COMMIT_SHA/g" tmp.html > frontend/dist/index.html
rm tmp.html
