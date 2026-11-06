import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/routes'
import { RouteErrorPage } from './RouteErrorPage'

describe('RouteErrorPage', () => {
  it('replaces the default error screen and offers a way back', () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          errorElement: <RouteErrorPage />,
          children: [
            {
              index: true,
              element: <Broken />,
            },
          ],
        },
      ],
      { initialEntries: ['/'] },
    )

    render(<RouterProvider router={router} />)

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.getByText('Boom')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Dashboard' })).toHaveAttribute('href', '/')
  })

  it('is the error page for the app shell and for the pages inside it', async () => {
    expect(routes).toHaveLength(1)
    expect(routes[0].errorElement).toBeTruthy()
    const shell = routes[0].children.find((route) =>
      route.children?.some((child) => child.errorElement),
    )
    const guarded = shell.children.find((route) => route.errorElement)
    expect(guarded?.errorElement).toBeTruthy()

    const router = createMemoryRouter(
      [
        {
          path: '/',
          errorElement: routes[0].errorElement,
          children: [{ index: true, element: <Broken /> }],
        },
      ],
      { initialEntries: ['/'] },
    )
    render(<RouterProvider router={router} />)
    expect(await screen.findByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Dashboard' })).toHaveAttribute('href', '/')
  })
})

function Broken() {
  throw new Error('Boom')
}
