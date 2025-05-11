#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ3Y2VlNDRkLWQwMzItNDQwMy05YTUwLWQ2ODhhNTJjOTc3ZiIsImVtYWlsIjoidmxhZEB3aXJlc3RvY2suaW8iLCJpYXQiOjE3NDY5NDkyNDcsImV4cCI6MTc0NzU1NDA0N30.Te0zeswFIHuonKwmq3Qk1EhgllBtIZltr7ekqvQbSiY"

LB_IDS=(
"3a58a31f-458f-43fe-940a-62ad09e0e46d"
"ad616a6e-4bac-4886-b299-e58488022089"
"fa0eb4a2-80bb-41be-877d-4e5a9e964fd9"
"43f8cd5c-018b-4365-8013-46e356790ff0"
"0780dabb-f394-4d55-b306-31fd2798c3f9"
)

MEDIA_URIS_1=(
"s3://wirestock-original-production/808/000BsxQHbSVfFrcJjXYhJy5tmQlZozzQGZBignv0.jpg"
"s3://wirestock-original-production/808/009ZpfXdth5OyR0T1HN0EZmE6fzxItnyy7LCADII.jpg"
"s3://wirestock-original-production/808/00fX5lm3MdD5PUDPlmXj8oFRtm3VL0fk4S67XuZG.jpeg"
"s3://wirestock-original-production/808/00JgqWkfBJrXvE3k4RNH88XYVWNXhaJz1QiLNYt1.jpg"
"s3://wirestock-original-production/808/00yYU0HrGOEoZlcwjdAqozjVurTBEbzdkfnncicd.jpg"
"s3://wirestock-original-production/808/01cckIrBkPAiy5Hb5AqHJ4l4oZBkW3ka0KoGMQEK.jpeg"
)
MEDIA_URIS_2=(
"s3://wirestock-original-production/808/00fX5lm3MdD5PUDPlmXj8oFRtm3VL0fk4S67XuZG.jpeg"
"s3://wirestock-original-production/808/01Mt3fRMbMdTzoFll8TeNLt2aSpaZ49W9ngAxwdj.jpeg"
"s3://wirestock-original-production/808/025rnrqgdrAER6DBDsLlrFD0LTZLhSeRFyUIY2Si.jpeg"
"s3://wirestock-original-production/808/02gGGTFmdJsVLnL29RyxBe6qDxKZ0qXPuTuro6aM.jpeg"
"s3://wirestock-original-production/808/02H54yfB7mRrXJzq4bffpI5gCbrKfjwF6G12GfNX.jpg"
"s3://wirestock-original-production/808/00yYU0HrGOEoZlcwjdAqozjVurTBEbzdkfnncicd.jpg"
)
MEDIA_URIS_3=(
"s3://wirestock-original-production/808/01cckIrBkPAiy5Hb5AqHJ4l4oZBkW3ka0KoGMQEK.jpeg"
"s3://wirestock-original-production/808/01Mt3fRMbMdTzoFll8TeNLt2aSpaZ49W9ngAxwdj.jpeg"
"s3://wirestock-original-production/808/025rnrqgdrAER6DBDsLlrFD0LTZLhSeRFyUIY2Si.jpeg"
"s3://wirestock-original-production/808/02gGGTFmdJsVLnL29RyxBe6qDxKZ0qXPuTuro6aM.jpeg"
"s3://wirestock-original-production/808/02H54yfB7mRrXJzq4bffpI5gCbrKfjwF6G12GfNX.jpg"
"s3://wirestock-original-production/808/00JgqWkfBJrXvE3k4RNH88XYVWNXhaJz1QiLNYt1.jpg"
)
MEDIA_URIS_4=(
"s3://wirestock-original-production/808/000BsxQHbSVfFrcJjXYhJy5tmQlZozzQGZBignv0.jpg"
"s3://wirestock-original-production/808/01cckIrBkPAiy5Hb5AqHJ4l4oZBkW3ka0KoGMQEK.jpeg"
"s3://wirestock-original-production/808/01Mt3fRMbMdTzoFll8TeNLt2aSpaZ49W9ngAxwdj.jpeg"
"s3://wirestock-original-production/808/025rnrqgdrAER6DBDsLlrFD0LTZLhSeRFyUIY2Si.jpeg"
"s3://wirestock-original-production/808/02gGGTFmdJsVLnL29RyxBe6qDxKZ0qXPuTuro6aM.jpeg"
"s3://wirestock-original-production/808/02H54yfB7mRrXJzq4bffpI5gCbrKfjwF6G12GfNX.jpg"
)
MEDIA_URIS_5=(
"s3://wirestock-original-production/808/000BsxQHbSVfFrcJjXYhJy5tmQlZozzQGZBignv0.jpg"
"s3://wirestock-original-production/808/009ZpfXdth5OyR0T1HN0EZmE6fzxItnyy7LCADII.jpg"
"s3://wirestock-original-production/808/00fX5lm3MdD5PUDPlmXj8oFRtm3VL0fk4S67XuZG.jpeg"
"s3://wirestock-original-production/808/00JgqWkfBJrXvE3k4RNH88XYVWNXhaJz1QiLNYt1.jpg"
"s3://wirestock-original-production/808/01cckIrBkPAiy5Hb5AqHJ4l4oZBkW3ka0KoGMQEK.jpeg"
"s3://wirestock-original-production/808/02gGGTFmdJsVLnL29RyxBe6qDxKZ0qXPuTuro6aM.jpeg"
)

guess_media_type() {
  case "$1" in
    *.jpg|*.jpeg|*.png) echo "image" ;;
    *.mp4|*.mov) echo "video" ;;
    *) echo "image" ;;
  esac
}

for i in {0..4}; do
  LB=${LB_IDS[$i]}
  MEDIA_VAR="MEDIA_URIS_$((i+1))[@]"
  MEDIA_URIS=("${!MEDIA_VAR}")
  echo "Seeding media for Lightbox $LB"
  ORDER=1
  for URI in "${MEDIA_URIS[@]}"; do
    TYPE=$(guess_media_type "$URI")
    echo "  Adding $URI as $TYPE (order $ORDER)"
    curl -s -X POST "http://localhost:3000/api/lightboxes/$LB/media" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"s3_uri\":\"$URI\",\"media_type\":\"$TYPE\",\"order\":$ORDER}" | jq
    ORDER=$((ORDER+1))
  done
  echo "---"
done 