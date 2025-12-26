import useModal from "hooks/useModal";
import React, { useEffect } from "react";
import { Link } from "react-router-dom";

export const NotFound = ({ pag }) => {
  const { setLoading } = useModal();
  useEffect(() => {
    setLoading({ loading: false });
  }, []);
  return (
    <div className="column notFoundPage">
      <span>Sahifa topilmadi</span>
      <Link to={"/"}>
        <button className="btn success">Bosh sahifa</button>
      </Link>
    </div>
  );
};
