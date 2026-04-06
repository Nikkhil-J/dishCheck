/**
 * Firestore security rules tests.
 *
 * Requires the Firestore emulator running on 127.0.0.1:8080:
 *   npx firebase emulators:start --only firestore
 *
 * Run with:
 *   npx vitest run src/__tests__/rules/firestore.rules.test.ts
 */

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, beforeAll, afterAll, beforeEach, it } from 'vitest'

const PROJECT_ID = 'demo-dishcheck-test'

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  const rules = readFileSync(resolve(__dirname, '../../../firestore.rules'), 'utf8')

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

// ── Users ─────────────────────────────────────────────────

describe('users collection', () => {
  it('allows unauthenticated read of any user doc', async () => {
    const unauthed = testEnv.unauthenticatedContext()
    const db = unauthed.firestore()

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('users').doc('user1').set({
        displayName: 'Test',
        email: 'test@example.com',
        isAdmin: false,
        isPremium: false,
      })
    })

    await assertSucceeds(db.collection('users').doc('user1').get())
  })

  it('allows authenticated user to create their own doc', async () => {
    const alice = testEnv.authenticatedContext('alice')
    const db = alice.firestore()

    await assertSucceeds(
      db.collection('users').doc('alice').set({
        displayName: 'Alice',
        email: 'alice@test.com',
        isAdmin: false,
        isPremium: false,
      })
    )
  })

  it('denies creating a doc for another user', async () => {
    const alice = testEnv.authenticatedContext('alice')
    const db = alice.firestore()

    await assertFails(
      db.collection('users').doc('bob').set({
        displayName: 'Bob',
        email: 'bob@test.com',
        isAdmin: false,
        isPremium: false,
      })
    )
  })

  it('allows owner to update safe profile fields', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('users').doc('alice').set({
        displayName: 'Alice',
        email: 'alice@test.com',
        city: '',
        isAdmin: false,
        isPremium: false,
      })
    })

    const alice = testEnv.authenticatedContext('alice')
    const db = alice.firestore()

    await assertSucceeds(
      db.collection('users').doc('alice').update({
        displayName: 'Alice Updated',
        city: 'Bengaluru',
      })
    )
  })

  it('denies owner writing isAdmin field', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('users').doc('alice').set({
        displayName: 'Alice',
        email: 'alice@test.com',
        isAdmin: false,
        isPremium: false,
      })
    })

    const alice = testEnv.authenticatedContext('alice')
    const db = alice.firestore()

    await assertFails(
      db.collection('users').doc('alice').update({ isAdmin: true })
    )
  })

  it('denies owner writing isPremium field', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('users').doc('alice').set({
        displayName: 'Alice',
        email: 'alice@test.com',
        isAdmin: false,
        isPremium: false,
      })
    })

    const alice = testEnv.authenticatedContext('alice')
    const db = alice.firestore()

    await assertFails(
      db.collection('users').doc('alice').update({ isPremium: true })
    )
  })

  it('denies cross-user update', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('users').doc('bob').set({
        displayName: 'Bob',
        email: 'bob@test.com',
        isAdmin: false,
        isPremium: false,
      })
    })

    const alice = testEnv.authenticatedContext('alice')
    const db = alice.firestore()

    await assertFails(
      db.collection('users').doc('bob').update({ displayName: 'Hacked' })
    )
  })

  it('denies user deleting their own doc', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('users').doc('alice').set({
        displayName: 'Alice',
        email: 'alice@test.com',
      })
    })

    const alice = testEnv.authenticatedContext('alice')
    const db = alice.firestore()

    await assertFails(db.collection('users').doc('alice').delete())
  })
})

// ── Wishlist subcollection ────────────────────────────────

describe('users/{userId}/wishlist subcollection', () => {
  it('allows owner to read and write their wishlist', async () => {
    const alice = testEnv.authenticatedContext('alice')
    const db = alice.firestore()

    await assertSucceeds(
      db.collection('users').doc('alice').collection('wishlist').doc('dish1').set({
        dishId: 'dish1',
        dishName: 'Biryani',
        savedAt: new Date(),
      })
    )

    await assertSucceeds(
      db.collection('users').doc('alice').collection('wishlist').doc('dish1').get()
    )
  })

  it('denies reading another user wishlist', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('users').doc('bob').collection('wishlist').doc('dish1').set({
        dishId: 'dish1',
        dishName: 'Biryani',
        savedAt: new Date(),
      })
    })

    const alice = testEnv.authenticatedContext('alice')
    const db = alice.firestore()

    await assertFails(
      db.collection('users').doc('bob').collection('wishlist').doc('dish1').get()
    )
  })
})

// ── Restaurants ───────────────────────────────────────────

describe('restaurants collection', () => {
  it('allows unauthenticated read', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('restaurants').doc('rest1').set({
        name: 'Test Restaurant',
        city: 'Bengaluru',
      })
    })

    const unauthed = testEnv.unauthenticatedContext()
    await assertSucceeds(unauthed.firestore().collection('restaurants').doc('rest1').get())
  })

  it('denies client write', async () => {
    const alice = testEnv.authenticatedContext('alice')
    const db = alice.firestore()

    await assertFails(
      db.collection('restaurants').doc('rest1').set({ name: 'Hacked' })
    )
  })
})

// ── Dishes ────────────────────────────────────────────────

describe('dishes collection', () => {
  it('allows unauthenticated read', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('dishes').doc('dish1').set({
        name: 'Biryani',
        restaurantId: 'rest1',
      })
    })

    const unauthed = testEnv.unauthenticatedContext()
    await assertSucceeds(unauthed.firestore().collection('dishes').doc('dish1').get())
  })

  it('denies client write', async () => {
    const alice = testEnv.authenticatedContext('alice')
    const db = alice.firestore()

    await assertFails(
      db.collection('dishes').doc('dish1').set({ name: 'Hacked' })
    )
  })
})

// ── Reviews ───────────────────────────────────────────────

describe('reviews collection', () => {
  it('allows unauthenticated read', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('reviews').doc('rev1').set({
        userId: 'alice',
        dishId: 'dish1',
        text: 'Great food',
      })
    })

    const unauthed = testEnv.unauthenticatedContext()
    await assertSucceeds(unauthed.firestore().collection('reviews').doc('rev1').get())
  })

  it('allows authenticated user to read reviews', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('reviews').doc('rev1').set({
        userId: 'alice',
        dishId: 'dish1',
        text: 'Great food',
      })
    })

    const alice = testEnv.authenticatedContext('alice')
    await assertSucceeds(alice.firestore().collection('reviews').doc('rev1').get())
  })

  it('regular authenticated user cannot write review directly to Firestore', async () => {
    const alice = testEnv.authenticatedContext('alice')
    const db = alice.firestore()

    await assertFails(
      db.collection('reviews').doc('rev1').set({
        userId: 'alice',
        dishId: 'dish1',
        tasteRating: 4,
        portionRating: 4,
        valueRating: 4,
      })
    )
  })

  it('denies client update even by owner', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('reviews').doc('rev1').set({
        userId: 'alice',
        dishId: 'dish1',
        text: 'Original',
      })
    })

    const alice = testEnv.authenticatedContext('alice')
    const db = alice.firestore()

    await assertFails(
      db.collection('reviews').doc('rev1').update({ text: 'Updated' })
    )
  })

  it('denies client delete even by owner', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('reviews').doc('rev1').set({
        userId: 'alice',
        dishId: 'dish1',
      })
    })

    const alice = testEnv.authenticatedContext('alice')
    const db = alice.firestore()

    await assertFails(db.collection('reviews').doc('rev1').delete())
  })
})

// ── Dish Requests ─────────────────────────────────────────

describe('dishRequests collection', () => {
  it('allows authenticated user to create request with own requestedBy', async () => {
    const alice = testEnv.authenticatedContext('alice')
    const db = alice.firestore()

    await assertSucceeds(
      db.collection('dishRequests').doc('req1').set({
        requestedBy: 'alice',
        dishName: 'Butter Chicken',
        restaurantId: 'rest1',
        restaurantName: 'Meghana',
        status: 'pending',
      })
    )
  })

  it('denies unauthenticated creating request', async () => {
    const unauthed = testEnv.unauthenticatedContext()

    await assertFails(
      unauthed.firestore().collection('dishRequests').doc('req1').set({
        requestedBy: 'alice',
        dishName: 'Butter Chicken',
        status: 'pending',
      })
    )
  })

  it('denies client update (status changes are server-only)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('dishRequests').doc('req1').set({
        requestedBy: 'alice',
        dishName: 'Butter Chicken',
        status: 'pending',
      })
    })

    const alice = testEnv.authenticatedContext('alice')
    const db = alice.firestore()

    await assertFails(
      db.collection('dishRequests').doc('req1').update({ status: 'approved' })
    )
  })
})

// ── Notifications ─────────────────────────────────────────

describe('notifications collection', () => {
  it('allows owner to read their notification', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('notifications').doc('notif1').set({
        userId: 'alice',
        type: 'system',
        title: 'Welcome!',
        isRead: false,
      })
    })

    const alice = testEnv.authenticatedContext('alice')
    const db = alice.firestore()

    await assertSucceeds(db.collection('notifications').doc('notif1').get())
  })

  it('denies reading another user notification', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('notifications').doc('notif1').set({
        userId: 'bob',
        type: 'system',
        title: 'Welcome!',
        isRead: false,
      })
    })

    const alice = testEnv.authenticatedContext('alice')
    const db = alice.firestore()

    await assertFails(db.collection('notifications').doc('notif1').get())
  })

  it('allows owner to mark notification as read', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('notifications').doc('notif1').set({
        userId: 'alice',
        type: 'system',
        title: 'Welcome!',
        isRead: false,
      })
    })

    const alice = testEnv.authenticatedContext('alice')
    const db = alice.firestore()

    await assertSucceeds(
      db.collection('notifications').doc('notif1').update({ isRead: true })
    )
  })

  it('denies client creating notifications', async () => {
    const alice = testEnv.authenticatedContext('alice')
    const db = alice.firestore()

    await assertFails(
      db.collection('notifications').doc('notif1').set({
        userId: 'alice',
        type: 'system',
        title: 'Fake',
        isRead: false,
      })
    )
  })

  it('denies changing non-isRead fields on notification', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('notifications').doc('notif1').set({
        userId: 'alice',
        type: 'system',
        title: 'Welcome!',
        isRead: false,
      })
    })

    const alice = testEnv.authenticatedContext('alice')
    const db = alice.firestore()

    await assertFails(
      db.collection('notifications').doc('notif1').update({
        isRead: true,
        title: 'Hacked',
      })
    )
  })
})
