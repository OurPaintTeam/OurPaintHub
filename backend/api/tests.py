from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from .models import User, UserProfile, Role, Friendship, Project, ProjectMeta, Documentation, FAQ


class UserRegistrationTests(APITestCase):
    def test_register_user_success(self):
        response = self.client.post('/api/registration/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(email='test@example.com').exists())

    def test_register_user_duplicate_email(self):
        User.objects.create(email='test@example.com', password='pass')
        response = self.client.post('/api/registration/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, 400)

    def test_register_user_invalid_email(self):
        response = self.client.post('/api/registration/', {
            'email': 'invalid-email',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, 400)

    def test_register_user_missing_fields(self):
        response = self.client.post('/api/registration/', {
            'email': 'test@example.com'
        })
        self.assertEqual(response.status_code, 400)


class UserLoginTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create(email='test@example.com', password='testpass123')

    def test_login_success(self):
        response = self.client.post('/api/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, 200)

    def test_login_wrong_password(self):
        response = self.client.post('/api/login/', {
            'email': 'test@example.com',
            'password': 'wrongpass'
        })
        self.assertEqual(response.status_code, 400)

    def test_login_nonexistent_user(self):
        response = self.client.post('/api/login/', {
            'email': 'nonexistent@example.com',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, 400)


class UserProfileTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create(email='test@example.com', password='testpass123')
        self.profile = UserProfile.objects.create(user=self.user, name='TestUser')

    def test_get_profile(self):
        response = self.client.get(f'/api/profile/?user_id={self.user.id}')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['nickname'], 'TestUser')

    def test_get_profile_not_found(self):
        response = self.client.get('/api/profile/?user_id=99999')
        self.assertEqual(response.status_code, 404)

    def test_update_profile(self):
        response = self.client.put('/api/profile/update/', {
            'user_id': self.user.id,
            'nickname': 'NewNickname',
            'bio': 'Test bio'
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.name, 'NewNickname')


class FriendshipTests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create(email='user1@example.com', password='pass1')
        self.user2 = User.objects.create(email='user2@example.com', password='pass2')
        self.user3 = User.objects.create(email='user3@example.com', password='pass3')
        UserProfile.objects.create(user=self.user1, name='User1')
        UserProfile.objects.create(user=self.user2, name='User2')
        UserProfile.objects.create(user=self.user3, name='User3')

    def test_send_friend_request(self):
        response = self.client.post('/api/friends/add/', {
            'user_id': self.user1.id,
            'friend_id': self.user2.id
        })
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Friendship.objects.filter(
            user1=self.user1, user2=self.user2, status='sent'
        ).exists())

    def test_accept_friend_request(self):
        Friendship.objects.create(user1=self.user1, user2=self.user2, status='sent')
        response = self.client.post('/api/friends/add/', {
            'user_id': self.user2.id,
            'friend_id': self.user1.id
        })
        self.assertEqual(response.status_code, 200)
        friendship = Friendship.objects.get(user1=self.user1, user2=self.user2)
        self.assertEqual(friendship.status, 'accepted')

    def test_cannot_add_self_as_friend(self):
        response = self.client.post('/api/friends/add/', {
            'user_id': self.user1.id,
            'friend_id': self.user1.id
        })
        self.assertEqual(response.status_code, 400)

    def test_get_friends(self):
        Friendship.objects.create(user1=self.user1, user2=self.user2, status='accepted')
        response = self.client.get(f'/api/friends/?user_id={self.user1.id}')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_get_friend_requests(self):
        Friendship.objects.create(user1=self.user1, user2=self.user2, status='sent')
        response = self.client.get(f'/api/friends/requests/?user_id={self.user2.id}')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_get_sent_friend_requests(self):
        Friendship.objects.create(user1=self.user1, user2=self.user2, status='sent')
        response = self.client.get(f'/api/friends/requests/sent/?user_id={self.user1.id}')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_respond_accept_request(self):
        Friendship.objects.create(user1=self.user1, user2=self.user2, status='sent')
        response = self.client.post('/api/friends/requests/respond/', {
            'user_id': self.user2.id,
            'from_user_id': self.user1.id,
            'action': 'accept'
        })
        self.assertEqual(response.status_code, 200)
        friendship = Friendship.objects.get(user1=self.user1, user2=self.user2)
        self.assertEqual(friendship.status, 'accepted')

    def test_respond_decline_request(self):
        Friendship.objects.create(user1=self.user1, user2=self.user2, status='sent')
        response = self.client.post('/api/friends/requests/respond/', {
            'user_id': self.user2.id,
            'from_user_id': self.user1.id,
            'action': 'decline'
        })
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Friendship.objects.filter(user1=self.user1, user2=self.user2).exists())

    def test_remove_friend(self):
        Friendship.objects.create(user1=self.user1, user2=self.user2, status='accepted')
        response = self.client.delete('/api/friends/remove/', {
            'user_id': self.user1.id,
            'friend_id': self.user2.id
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Friendship.objects.filter(user1=self.user1, user2=self.user2).exists())

    def test_cancel_friend_request(self):
        Friendship.objects.create(user1=self.user1, user2=self.user2, status='sent')
        response = self.client.post('/api/friends/requests/cancel/', {
            'user_id': self.user1.id,
            'receiver_id': self.user2.id
        })
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Friendship.objects.filter(user1=self.user1, user2=self.user2).exists())


class RoleTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create(email='test@example.com', password='testpass123')
        self.admin = User.objects.create(email='admin@example.com', password='adminpass')
        Role.objects.create(user=self.admin, role='admin')

    def test_check_user_role(self):
        response = self.client.get(f'/api/user/role/?user_id={self.user.id}')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['is_admin'])

    def test_check_admin_role(self):
        response = self.client.get(f'/api/user/role/?user_id={self.admin.id}')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['is_admin'])


class NewsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create(email='admin@example.com', password='adminpass')
        Role.objects.create(user=self.admin, role='admin')
        self.user = User.objects.create(email='user@example.com', password='userpass')

    def test_get_news(self):
        Documentation.objects.create(type='guide', admin=self.admin, text='# Test News\n\nContent')
        response = self.client.get('/api/news/')
        self.assertEqual(response.status_code, 200)

    def test_create_news_as_admin(self):
        response = self.client.post('/api/news/create/', {
            'user_id': self.admin.id,
            'title': 'Test News',
            'content': 'Test content'
        })
        self.assertEqual(response.status_code, 201)

    def test_create_news_as_user_forbidden(self):
        response = self.client.post('/api/news/create/', {
            'user_id': self.user.id,
            'title': 'Test News',
            'content': 'Test content'
        })
        self.assertEqual(response.status_code, 403)


class DocumentationTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create(email='admin@example.com', password='adminpass')
        Role.objects.create(user=self.admin, role='admin')
        self.user = User.objects.create(email='user@example.com', password='userpass')

    def test_get_documentation(self):
        Documentation.objects.create(
            type='reference', 
            admin=self.admin, 
            text='# Test Doc\n\nContent\n\n<!-- CATEGORY: Примитивы -->'
        )
        response = self.client.get('/api/documentation/')
        self.assertEqual(response.status_code, 200)

    def test_create_documentation_as_admin(self):
        response = self.client.post('/api/documentation/create/', {
            'user_id': self.admin.id,
            'title': 'Test Doc',
            'content': 'Test content',
            'category': 'Примитивы'
        })
        self.assertEqual(response.status_code, 201)

    def test_create_documentation_as_user_forbidden(self):
        response = self.client.post('/api/documentation/create/', {
            'user_id': self.user.id,
            'title': 'Test Doc',
            'content': 'Test content',
            'category': 'Примитивы'
        })
        self.assertEqual(response.status_code, 403)


class FAQTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create(email='admin@example.com', password='adminpass')
        Role.objects.create(user=self.admin, role='admin')
        self.user = User.objects.create(email='user@example.com', password='userpass')

    def test_create_question(self):
        response = self.client.post('/api/QA/create/', {
            'user_id': self.user.id,
            'text_question': 'How does this work?'
        })
        self.assertEqual(response.status_code, 201)
        self.assertTrue(FAQ.objects.filter(text_question='How does this work?').exists())

    def test_get_qa_list(self):
        FAQ.objects.create(user=self.user, text_question='Test question')
        response = self.client.get('/api/QA/')
        self.assertEqual(response.status_code, 200)

    def test_answer_question_as_admin(self):
        faq = FAQ.objects.create(user=self.user, text_question='Test question')
        response = self.client.patch(f'/api/QA/{faq.id}/answer/', {
            'user_id': self.admin.id,
            'answer_text': 'Test answer'
        })
        self.assertEqual(response.status_code, 200)
        faq.refresh_from_db()
        self.assertTrue(faq.answered)

    def test_answer_question_as_user_forbidden(self):
        faq = FAQ.objects.create(user=self.user, text_question='Test question')
        response = self.client.patch(f'/api/QA/{faq.id}/answer/', {
            'user_id': self.user.id,
            'answer_text': 'Test answer'
        })
        self.assertEqual(response.status_code, 403)


class HelperFunctionTests(TestCase):
    def setUp(self):
        self.user1 = User.objects.create(email='user1@example.com', password='pass1')
        self.user2 = User.objects.create(email='user2@example.com', password='pass2')
        self.user3 = User.objects.create(email='user3@example.com', password='pass3')

    def test_get_friendship_between_exists(self):
        from .views import get_friendship_between
        Friendship.objects.create(user1=self.user1, user2=self.user2, status='accepted')
        result = get_friendship_between(self.user1.id, self.user2.id)
        self.assertIsNotNone(result)
        self.assertEqual(result[2], 'accepted')

    def test_get_friendship_between_reverse(self):
        from .views import get_friendship_between
        Friendship.objects.create(user1=self.user1, user2=self.user2, status='sent')
        result = get_friendship_between(self.user2.id, self.user1.id)
        self.assertIsNotNone(result)

    def test_get_friendship_between_not_exists(self):
        from .views import get_friendship_between
        result = get_friendship_between(self.user1.id, self.user2.id)
        self.assertIsNone(result)

    def test_get_friend_ids(self):
        from .views import get_friend_ids
        Friendship.objects.create(user1=self.user1, user2=self.user2, status='accepted')
        Friendship.objects.create(user1=self.user3, user2=self.user1, status='accepted')
        ids = get_friend_ids(self.user1)
        self.assertEqual(len(ids), 2)
        self.assertIn(self.user2.id, ids)
        self.assertIn(self.user3.id, ids)

    def test_get_friend_ids_excludes_sent(self):
        from .views import get_friend_ids
        Friendship.objects.create(user1=self.user1, user2=self.user2, status='sent')
        ids = get_friend_ids(self.user1)
        self.assertEqual(len(ids), 0)

    def test_make_friendship_entity_id(self):
        from .views import make_friendship_entity_id
        id1 = make_friendship_entity_id(1, 2)
        id2 = make_friendship_entity_id(2, 1)
        self.assertEqual(id1, id2)
