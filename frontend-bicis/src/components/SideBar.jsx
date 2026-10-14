import React from "react";
import { Link, NavLink } from "react-router";

export default function SideBar() {
  return (
    <aside>
      <section>
        <NavLink to={"/new"}>Crear reparacion</NavLink>{" "}
      </section>
      <section>
        <button>Buscar</button>
      </section>
      <section>
        <button>Crear reparacion</button>
      </section>
    </aside>
  );
}
