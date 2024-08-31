from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.decorators import api_view
from .serializers import CustomUserSerializer
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated
from warehouse.models import Company, Product, ProductMarking, Income, Outcome, CustomUser
from .serializers import CompanySerializer, ProductSerializer, ProductMarkingSerializer, IncomeSerializer, \
    OutcomeSerializer


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer


class ProductMarkingViewSet(viewsets.ModelViewSet):
    queryset = ProductMarking.objects.all()
    serializer_class = ProductMarkingSerializer
    permission_classes = [AllowAny]
    http_method_names = ['get', 'post', 'put', 'delete']


class IncomeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Income.objects.all()
    serializer_class = IncomeSerializer


class OutcomeViewSet(viewsets.ModelViewSet):
    queryset = Outcome.objects.all()
    serializer_class = OutcomeSerializer

    def destroy(self, request, *args, **kwargs):
        outcome = self.get_object()

        # Check for related ProductMarkings and set their foreign key to None if needed
        ProductMarking.objects.filter(outcome=outcome).update(outcome=None)

        # Now you can safely delete the outcome
        outcome.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UpdateMarkingView(APIView):
    def put(self, request, income_id, product_id, marking_id):
        try:
            marking = ProductMarking.objects.get(id=marking_id, income_id=income_id, product_id=product_id)
        except ProductMarking.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = ProductMarkingSerializer(marking, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, income_id, product_id, marking_id, format=None):
        try:
            # Извлечение объектов по их ID
            marking = ProductMarking.objects.get(id=marking_id, product_id=product_id, income_id=income_id)
            marking.delete()  # Удаление маркировки
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProductMarking.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super(MyTokenObtainPairSerializer, cls).get_token(user)
        # Добавляем дополнительные данные в токен
        token['username'] = user.username
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        token['email'] = user.email
        token['phone'] = user.phone
        token['position'] = user.position
        print(token)
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data.update({
            'username': self.user.username,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'email': self.user.email,
            'phone': self.user.phone,
            'position': self.user.position,
        })
        return data


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    queryset = get_user_model().objects.all()
    permission_classes = (AllowAny,)
    serializer_class = CustomUserSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = get_user_model().objects.create_user(
                username=serializer.validated_data['username'],
                password=request.data['password'],
                first_name=serializer.validated_data.get('first_name', ''),
                last_name=serializer.validated_data.get('last_name', ''),
                email=serializer.validated_data.get('email', ''),
                phone=serializer.validated_data.get('phone', ''),
                position=serializer.validated_data.get('position', '')
            )
            return Response(status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def logout_view(request):
    try:
        refresh_token = request.data['refresh_token']
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response(status=status.HTTP_205_RESET_CONTENT)
    except Exception as e:
        return Response(status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def check_marking_exists(request, marking):
    exists = ProductMarking.objects.filter(marking=marking).exists()
    return Response({'exists': exists})
