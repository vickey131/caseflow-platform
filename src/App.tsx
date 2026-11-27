import { NavLink, Outlet } from 'react-router'

function App() {
  return (
    <div>
      <header>
        <h1>CaseFlow</h1>
        <nav>
          <NavLink to="/cases">Cases</NavLink> | <NavLink to="/cases/new">New case</NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

export default App
