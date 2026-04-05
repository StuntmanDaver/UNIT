# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - link "Back" [ref=e6] [cursor=pointer]:
        - /url: /Welcome
        - img [ref=e7]
        - generic [ref=e9]: Back
      - generic [ref=e10]:
        - img [ref=e11]
        - generic [ref=e18]: Unit
  - main [ref=e19]:
    - generic [ref=e20]:
      - generic [ref=e21]:
        - img [ref=e23]
        - heading "Landlord Access" [level=1] [ref=e26]
        - paragraph [ref=e27]: Enter your email to receive a sign-in link
      - generic [ref=e29]:
        - generic [ref=e30]:
          - text: Email address
          - textbox "Email address" [ref=e31]:
            - /placeholder: landlord@example.com
            - text: landlord@example.com
        - generic [ref=e32]: Something went wrong sending your link. Check your email address and try again.
        - button "Send Magic Link" [ref=e33] [cursor=pointer]
      - paragraph [ref=e34]:
        - text: Contact Unit
        - link "support" [ref=e35] [cursor=pointer]:
          - /url: mailto:support@unitapp.com
        - text: for access
```