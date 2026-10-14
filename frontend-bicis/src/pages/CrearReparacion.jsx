import React, { useState } from "react";
import { states } from "../consts/reparation-states.js";
export default function CrearReparacion() {
  const [section, setSection] = useState(0);

  return (
    <main>
      <form action="">
        <section id="section-user">
          <label htmlFor="name">Nombre del cliente</label>
          <input type="text" name="name" id="name" />
          <input
            type="text"
            name="surname"
            id="surname"
            placeholder="Apellidos: Martin"
          />
          <input type="tel" name="telefono" id="telefono" />
        </section>
        <section id="section-tipo-bici"></section>
        <section id="section-bicis">
          <fieldset>
            <legend>Problema de la bicicleta</legend>
            <div>
              <input
                type="radio"
                name="problema"
                id="pinchado"
                value="pinchado"
              />
              <label htmlFor="pinchado">Rueda pinchada</label>
            </div>
            <div>
              <input type="radio" name="problema" id="frenos" value="frenos" />
              <label htmlFor="frenos">Frenos defectuosos</label>
            </div>
            <div>
              <input type="radio" name="problema" id="cadena" value="cadena" />
              <label htmlFor="cadena">Cadena rota o desgastada</label>
            </div>
            <div>
              <input
                type="radio"
                name="problema"
                id="cambios"
                value="cambios"
              />
              <label htmlFor="cambios">Cambios desajustados</label>
            </div>
            <div>
              <input
                type="radio"
                name="problema"
                id="direccion"
                value="direccion"
              />
              <label htmlFor="direccion">Dirección desalineada</label>
            </div>
            <div>
              <input
                type="radio"
                name="problema"
                id="pedales"
                value="pedales"
              />
              <label htmlFor="pedales">Pedales dañados</label>
            </div>
            <div>
              <input type="radio" name="problema" id="sillin" value="sillin" />
              <label htmlFor="sillin">Sillín roto</label>
            </div>
            <div>
              <input type="radio" name="problema" id="otro" value="otro" />
              <label htmlFor="otro">Otro problema</label>
            </div>
          </fieldset>
        </section>
      </form>
    </main>
  );
}
