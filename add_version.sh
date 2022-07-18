
COMMIT_DATE=$(git log --pretty="%cd" --date=short -n 1)
COMMIT_SHA=$(git log --pretty="%h" -n 1)

sed "s/COMMIT_DATE/$COMMIT_DATE/g" frontend/dist/index.html > tmp.html
sed "s/COMMIT_SHA/$COMMIT_SHA/g" tmp.html > frontend/dist/index.html
rm tmp.html
