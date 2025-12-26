import React, { memo, useEffect, useState } from "react";
import { LazyLoadImage } from "react-lazy-load-image-component";

function CustomImg({ image, className = "custom-image" }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (image.includes("http")) {
      setSrc(image);
    } else {
      setSrc(`${process.env.REACT_APP_PUBLIC_SERVER_URL}api/getFile/${image}`);
    }
  }, [image]);

  return <LazyLoadImage className={className} alt={"gap-bor"} src={src} />;
}

export default memo(CustomImg);
